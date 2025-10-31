import 'cypress-mochawesome-reporter/register';

// Pode-se ignorar exceções não críticas do app durante o teste
// (útil quando imagens base64 não renderizam em ambiente headless)
// Retornar false evita falha do teste por erro não capturado.
// Ajuste conforme necessidade.
//
// Cypress.on('uncaught:exception', (err) => {
//   return false;
// });
