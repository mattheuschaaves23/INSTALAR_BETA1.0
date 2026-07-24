package br.com.instalapro.instaladores;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "NativeAppUpdater")
public class NativeAppUpdaterPlugin extends Plugin {

    private static final String APK_MIME_TYPE = "application/vnd.android.package-archive";
    private static final String UPDATE_FILE_NAME = "InstalaPro-Instaladores-update.apk";
    private static final long MAX_APK_SIZE_BYTES = 200L * 1024L * 1024L;
    private static final int BUFFER_SIZE = 64 * 1024;
    private static final int MAX_REDIRECTS = 8;
    private final AtomicBoolean downloadRunning = new AtomicBoolean(false);

    @PluginMethod
    public void getInstallPermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("allowed", canRequestPackageInstalls());
        call.resolve(result);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            JSObject result = new JSObject();
            result.put("opened", false);
            result.put("allowed", true);
            call.resolve(result);
            return;
        }

        try {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("opened", true);
            result.put("allowed", canRequestPackageInstalls());
            call.resolve(result);
        } catch (ActivityNotFoundException error) {
            call.reject("Não foi possível abrir a permissão de instalação.", error);
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String downloadUrl = call.getString("url");

        if (!isOfficialReleaseUrl(downloadUrl)) {
            call.reject("O endereço da atualização não é permitido.");
            return;
        }

        if (!canRequestPackageInstalls()) {
            JSObject result = new JSObject();
            result.put("permissionRequired", true);
            result.put("started", false);
            call.resolve(result);
            return;
        }

        if (!downloadRunning.compareAndSet(false, true)) {
            call.reject("Uma atualização já está sendo baixada.");
            return;
        }

        execute(() -> {
            File partialFile = null;
            File apkFile = null;

            try {
                File updatesDirectory = getUpdatesDirectory();
                apkFile = new File(updatesDirectory, UPDATE_FILE_NAME);
                partialFile = new File(updatesDirectory, UPDATE_FILE_NAME + ".part");

                deleteIfPresent(partialFile);
                deleteIfPresent(apkFile);
                downloadApk(downloadUrl, partialFile);

                if (!partialFile.renameTo(apkFile)) {
                    copyFile(partialFile, apkFile);
                    deleteIfPresent(partialFile);
                }

                validateDownloadedApk(apkFile);
                openAndroidInstaller(apkFile);

                JSObject result = new JSObject();
                result.put("permissionRequired", false);
                result.put("started", true);
                call.resolve(result);
            } catch (Exception error) {
                if (partialFile != null) {
                    deleteIfPresent(partialFile);
                }
                if (apkFile != null) {
                    deleteIfPresent(apkFile);
                }
                call.reject(
                    error.getMessage() == null ? "Não foi possível instalar a atualização." : error.getMessage(),
                    error
                );
            } finally {
                downloadRunning.set(false);
            }
        });
    }

    private boolean canRequestPackageInstalls() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O
            || getContext().getPackageManager().canRequestPackageInstalls();
    }

    private File getUpdatesDirectory() throws IOException {
        File downloadsDirectory = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);

        if (downloadsDirectory == null) {
            throw new IOException("O armazenamento do aparelho não está disponível.");
        }

        File updatesDirectory = new File(downloadsDirectory, "updates");

        if (!updatesDirectory.exists() && !updatesDirectory.mkdirs()) {
            throw new IOException("Não foi possível preparar o arquivo da atualização.");
        }

        return updatesDirectory;
    }

    private void downloadApk(String downloadUrl, File targetFile) throws Exception {
        HttpURLConnection connection = openTrustedConnection(downloadUrl);
        long contentLength = connection.getContentLengthLong();

        if (contentLength > MAX_APK_SIZE_BYTES) {
            connection.disconnect();
            throw new IOException("O arquivo da atualização é maior que o permitido.");
        }

        long downloadedBytes = 0;
        int lastPercent = -1;

        try (
            InputStream input = new BufferedInputStream(connection.getInputStream());
            BufferedOutputStream output = new BufferedOutputStream(new FileOutputStream(targetFile))
        ) {
            byte[] buffer = new byte[BUFFER_SIZE];
            int bytesRead;

            while ((bytesRead = input.read(buffer)) != -1) {
                downloadedBytes += bytesRead;

                if (downloadedBytes > MAX_APK_SIZE_BYTES) {
                    throw new IOException("O arquivo da atualização é maior que o permitido.");
                }

                output.write(buffer, 0, bytesRead);

                int percent = contentLength > 0
                    ? (int) Math.min(100, (downloadedBytes * 100L) / contentLength)
                    : -1;

                if (percent != lastPercent) {
                    lastPercent = percent;
                    notifyDownloadProgress(downloadedBytes, contentLength, percent);
                }
            }
        } finally {
            connection.disconnect();
        }

        if (downloadedBytes < 1024 * 1024) {
            throw new IOException("O arquivo recebido não parece ser um aplicativo válido.");
        }

        notifyDownloadProgress(downloadedBytes, downloadedBytes, 100);
    }

    private HttpURLConnection openTrustedConnection(String initialUrl) throws Exception {
        String currentUrl = initialUrl;

        for (int redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
            if (!isTrustedDownloadUrl(currentUrl)) {
                throw new IOException("O download foi redirecionado para um endereço não permitido.");
            }

            HttpURLConnection connection = (HttpURLConnection) new URL(currentUrl).openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(20_000);
            connection.setReadTimeout(45_000);
            connection.setRequestProperty("Accept", APK_MIME_TYPE + ", application/octet-stream");
            connection.setRequestProperty("User-Agent", "InstalaPro-Instaladores-Android");

            int statusCode = connection.getResponseCode();

            if (statusCode >= 200 && statusCode < 300) {
                return connection;
            }

            if (statusCode == 301 || statusCode == 302 || statusCode == 303 || statusCode == 307 || statusCode == 308) {
                String location = connection.getHeaderField("Location");
                connection.disconnect();

                if (location == null || location.trim().isEmpty()) {
                    throw new IOException("O servidor não informou o endereço da atualização.");
                }

                currentUrl = new URL(new URL(currentUrl), location).toString();
                continue;
            }

            connection.disconnect();
            throw new IOException("O servidor recusou o download da atualização.");
        }

        throw new IOException("A atualização excedeu o limite de redirecionamentos.");
    }

    private boolean isTrustedDownloadUrl(String rawUrl) {
        if (isOfficialReleaseUrl(rawUrl)) {
            return true;
        }

        if (rawUrl == null || rawUrl.trim().isEmpty()) {
            return false;
        }

        try {
            URI uri = URI.create(rawUrl);
            String scheme = uri.getScheme();
            String host = uri.getHost();

            if (!"https".equalsIgnoreCase(scheme) || host == null || uri.getUserInfo() != null) {
                return false;
            }

            int port = uri.getPort();
            if (port != -1 && port != 443) {
                return false;
            }

            String normalizedHost = host.toLowerCase(Locale.ROOT);
            return "githubusercontent.com".equals(normalizedHost)
                || normalizedHost.endsWith(".githubusercontent.com");
        } catch (IllegalArgumentException error) {
            return false;
        }
    }

    private boolean isOfficialReleaseUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.trim().isEmpty()) {
            return false;
        }

        try {
            URI uri = URI.create(rawUrl);
            String scheme = uri.getScheme();
            String host = uri.getHost();

            if (!"https".equalsIgnoreCase(scheme) || host == null || uri.getUserInfo() != null) {
                return false;
            }

            int port = uri.getPort();
            if (port != -1 && port != 443) {
                return false;
            }

            String normalizedHost = host.toLowerCase(Locale.ROOT);
            String path = uri.getPath();
            return "github.com".equals(normalizedHost)
                && path != null
                && path.startsWith("/mattheuschaaves23/Instalar/releases/");
        } catch (IllegalArgumentException error) {
            return false;
        }
    }

    private void validateDownloadedApk(File apkFile) throws Exception {
        PackageManager packageManager = getContext().getPackageManager();
        int signatureFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
            ? PackageManager.GET_SIGNING_CERTIFICATES
            : PackageManager.GET_SIGNATURES;
        PackageInfo downloadedPackage = packageManager.getPackageArchiveInfo(apkFile.getAbsolutePath(), signatureFlags);

        if (downloadedPackage == null) {
            throw new IOException("O Android não reconheceu o arquivo da atualização.");
        }

        String currentPackageName = getContext().getPackageName();

        if (!currentPackageName.equals(downloadedPackage.packageName)) {
            throw new SecurityException("A atualização não pertence ao aplicativo InstalaPro.");
        }

        PackageInfo installedPackage = packageManager.getPackageInfo(currentPackageName, signatureFlags);

        if (getLongVersionCode(downloadedPackage) <= getLongVersionCode(installedPackage)) {
            throw new IOException("A versão baixada não é mais nova que a instalada.");
        }

        if (!getSignerDigests(downloadedPackage).equals(getSignerDigests(installedPackage))) {
            throw new SecurityException("A assinatura da atualização não corresponde ao aplicativo instalado.");
        }
    }

    private long getLongVersionCode(PackageInfo packageInfo) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            return packageInfo.getLongVersionCode();
        }

        return packageInfo.versionCode;
    }

    @SuppressWarnings("deprecation")
    private Set<String> getSignerDigests(PackageInfo packageInfo) throws Exception {
        Signature[] signatures;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            if (packageInfo.signingInfo == null) {
                throw new SecurityException("O Android não conseguiu verificar a assinatura do aplicativo.");
            }
            signatures = packageInfo.signingInfo.getApkContentsSigners();
        } else {
            signatures = packageInfo.signatures;
        }

        if (signatures == null || signatures.length == 0) {
            throw new SecurityException("O aplicativo não possui uma assinatura válida.");
        }

        Set<String> digests = new HashSet<>();
        MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");

        for (Signature signature : signatures) {
            byte[] digest = messageDigest.digest(signature.toByteArray());
            digests.add(toHex(digest));
        }

        return digests;
    }

    private String toHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);

        for (byte value : bytes) {
            builder.append(String.format(Locale.ROOT, "%02x", value & 0xff));
        }

        return builder.toString();
    }

    private void openAndroidInstaller(File apkFile) {
        Uri apkUri = FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            apkFile
        );
        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(apkUri, APK_MIME_TYPE);
        installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        try {
            getContext().startActivity(installIntent);
        } catch (ActivityNotFoundException error) {
            throw new IllegalStateException("O instalador do Android não está disponível.", error);
        }
    }

    private void notifyDownloadProgress(long downloadedBytes, long totalBytes, int percent) {
        JSObject progress = new JSObject();
        progress.put("downloadedBytes", downloadedBytes);
        progress.put("totalBytes", totalBytes);
        progress.put("percent", percent);
        notifyListeners("downloadProgress", progress);
    }

    private void copyFile(File source, File destination) throws IOException {
        try (
            BufferedInputStream input = new BufferedInputStream(new FileInputStream(source));
            BufferedOutputStream output = new BufferedOutputStream(new FileOutputStream(destination))
        ) {
            byte[] buffer = new byte[BUFFER_SIZE];
            int bytesRead;

            while ((bytesRead = input.read(buffer)) != -1) {
                output.write(buffer, 0, bytesRead);
            }
        }
    }

    private void deleteIfPresent(File file) {
        if (file != null && file.exists() && !file.delete()) {
            file.deleteOnExit();
        }
    }
}
