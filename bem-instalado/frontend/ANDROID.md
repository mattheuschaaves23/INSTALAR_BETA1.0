# InstalaPro Instaladores para Android

O aplicativo Android é exclusivo para contas de instalador. O modo Android usa
a API de produção configurada em `.env.android` e não permite abrir áreas de
cliente, páginas públicas ou o painel administrativo.

## Requisitos

- Node.js 22.12 ou mais recente
- Java 21
- Android SDK 36
- Android 7 ou superior no aparelho
- Android System WebView ou Google Chrome atualizado

## Gerar o projeto web do aplicativo

```bash
npm ci
npm run build:android:web
npx cap sync android
```

## Gerar APK de desenvolvimento

No Windows, todo o processo pode ser executado com:

```powershell
npm run android:apk:debug
```

No Linux ou macOS:

```bash
npm run android:sync
cd android
./gradlew assembleDebug
```

O APK será criado em `android/app/build/outputs/apk/debug/app-debug.apk`. Esse
arquivo usa a assinatura de depuração do Android e serve para instalação e
testes diretos.

## Publicação automática

Tags no formato `android-v1.0.0` executam o fluxo `Android Instaladores` no
GitHub Actions. O APK e seu arquivo SHA-256 são anexados automaticamente a uma
versão pública no GitHub.

Para publicar na Google Play, configure um keystore permanente e gere um AAB de
versão. O keystore nunca deve ser salvo no repositório.
