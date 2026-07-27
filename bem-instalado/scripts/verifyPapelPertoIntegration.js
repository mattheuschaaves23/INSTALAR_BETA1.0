const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

const app = read('frontend/src/App.jsx');
const home = read('frontend/src/components/Public/Home.jsx');
const locationGlobe = read('frontend/src/components/Public/AnimatedLocationGlobe.jsx');
const landing = read('frontend/src/components/Public/ClientLandingLegacy.jsx');
const apiClient = read('frontend/src/services/api.jsx');
const publicRoutes = read('backend/routes/publicRoutes.js');
const publicController = read('backend/controllers/publicController.js');
const serviceRequestController = read('backend/controllers/serviceRequestController.js');
const opportunityRoutes = read('backend/routes/opportunityRoutes.js');
const reverseGeocoder = read('backend/utils/reverseGeocode.js');

assert.match(app, /path="\/papelperto"/, 'A rota pública /papelperto precisa continuar disponível.');
assert.match(landing, /const REQUEST_PATH = '\/cliente';/, 'A landing deve enviar o cliente à área integrada de busca.');
assert.match(home, /const SHOW_PUBLIC_INSTALLER_DIRECTORY = false;/, 'O cliente não deve escolher um instalador antes de publicar o pedido.');
assert.match(home, /api\.get\('\/public\/installers'/, 'O PapelPerto deve consultar instaladores no backend do InstalaPro.');
assert.match(home, /setShowPublishForm\(true\);/, 'A busca guiada deve seguir diretamente para a publicação do pedido.');
assert.match(home, /document\.getElementById\('publicar-pedido'\)/, 'Ao concluir os dados, o cliente deve seguir para a publicação.');
assert.match(home, />\s*Continuar para publicar\s*</, 'O pedido guiado deve terminar com a ação de publicar.');
assert.match(home, /Responda quatro etapas rápidas/, 'O fluxo do cliente deve explicar que possui apenas quatro etapas.');
assert.doesNotMatch(home, /serviceIntroStep|detailStep/, 'O fluxo não deve voltar a criar subetapas que confundem o cliente.');
assert.match(home, /className="client-app-optional-details"/, 'Observações e fotos opcionais devem ficar recolhidas.');
assert.match(home, /className="client-app-clean-summary"/, 'A confirmação deve usar um resumo compacto e organizado.');
assert.match(home, /className="client-app-result-overview/, 'Após preencher, o cliente deve ver um resumo curto do pedido.');
assert.match(home, /className="client-app-results-filters/, 'Filtros avançados devem ficar recolhidos após a busca.');
assert.match(home, /Publique para os instaladores da região/, 'A publicação deve explicar que os profissionais próximos receberão o pedido.');
assert.match(home, /Chamar este instalador/, 'O cliente deve escolher quem chamar somente entre os interessados.');
assert.doesNotMatch(home, /className="client-app-request-receipt/, 'O resumo do pedido não deve ser repetido após a busca.');
assert.doesNotMatch(home, /className="client-app-finder-intro/, 'A introdução dos resultados não deve duplicar informações já confirmadas.');
assert.match(home, /placeholder="Rua, bairro ou cidade"/, 'A localização deve usar o campo único do Pertolar.');
assert.match(home, /className="client-app-pertolar-locate"/, 'A localização deve oferecer o GPS como no Pertolar.');
assert.match(home, /navigator\.geolocation\.watchPosition/, 'O GPS deve aguardar a melhor leitura disponível.');
assert.match(home, /maximumAge: 0/, 'O GPS não deve reutilizar uma localização antiga.');
assert.match(home, /gpsRegionOnly: true/, 'O GPS deve confirmar apenas a região, sem inventar uma rua próxima.');
assert.match(home, /api\.get\('\/public\/location\/search'/, 'O endereço digitado deve consultar sugestões geográficas.');
assert.match(home, /<AnimatedLocationGlobe/, 'A localizacao deve exibir o globo animado do Pertolar.');
assert.match(locationGlobe, /geoOrthographic/, 'O globo deve usar uma projecao geografica real.');
assert.match(locationGlobe, /requestAnimationFrame/, 'O globo deve girar continuamente.');
assert.ok(
  home.indexOf('id="resultados"') < home.indexOf('id="publicar-pedido"'),
  'Os resultados precisam aparecer antes da publicação opcional do pedido.'
);
assert.match(publicRoutes, /router\.get\('\/installers'.*controller\.getInstallers\);/, 'A API pública de instaladores precisa estar registrada.');
assert.match(publicRoutes, /router\.get\('\/location\/search'.*controller\.searchLocation\);/, 'A API pública de endereços precisa estar registrada.');
assert.match(publicRoutes, /router\.post\('\/service-requests'/, 'A publicação pública de pedidos precisa estar registrada.');
assert.match(publicRoutes, /router\.get\('\/service-requests\/:id\/interests'/, 'O cliente precisa poder acompanhar interessados.');
assert.match(publicRoutes, /router\.post\('\/service-requests\/:id\/interests\/:interestId\/select'/, 'A escolha final precisa estar registrada.');
assert.match(opportunityRoutes, /router\.post\('\/:id\/interest'.*expressInterest\);/, 'Instaladores precisam poder demonstrar interesse.');
assert.match(publicController, /forwardGeocode/, 'O backend deve transformar endereços em cidade e estado para a busca.');
assert.match(reverseGeocoder, /zoom: '14'/, 'A localização automática deve consultar nível de região, não uma rua aproximada.');
assert.doesNotMatch(publicController, /generateWhatsAppLink/, 'Perfis públicos não podem liberar contato direto.');
assert.match(serviceRequestController, /details: row\.details \|\| null/, 'A proposta deve mostrar os detalhes necessários ao instalador.');
assert.match(serviceRequestController, /photo_urls: row\.photo_urls \|\| \[\]/, 'A proposta deve mostrar as fotos do serviço.');
assert.match(serviceRequestController, /client_phone: selectedByMe \? row\.client_phone : null/, 'O telefone deve ficar privado até a escolha.');
assert.match(serviceRequestController, /INSTALLER_ALREADY_SELECTED/, 'A escolha final do cliente não pode ser trocada por outra chamada.');
assert.match(apiClient, /path\.startsWith\('\/papelperto'\)/, 'Sessões do cliente no PapelPerto devem usar o login correto.');

console.log('Integração PapelPerto + InstalaPro verificada.');
