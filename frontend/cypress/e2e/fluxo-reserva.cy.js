describe('Fluxo de reserva com disponibilidade e PIX', () => {
  it('lista quartos, checa disponibilidade, reserva e exibe PIX', () => {
    // Intercepta listagem de quartos
    cy.intercept('GET', '/api/quartos', {
      statusCode: 200,
      body: [
        { id: 1, nome: 'Quarto Standard', descricao: 'Confortável', precoNoite: 150, capacidade: 2 },
        { id: 2, nome: 'Quarto Deluxe', descricao: 'Espaçoso', precoNoite: 300, capacidade: 4 }
      ]
    }).as('getQuartos');

    cy.visit('/');
    cy.wait('@getQuartos');
    cy.contains('Quarto Standard').should('be.visible');

    // Seleciona um quarto
    cy.contains('Selecionar').first().click();

    // Preenche dados
    cy.get('input[placeholder="Nome"]').type('Cliente Teste');
    cy.get('input[placeholder="Email"]').type('cliente@teste.com');
    cy.get('input[type="date"]').first().type('2025-11-01');
    cy.get('input[type="date"]').eq(1).type('2025-11-03');
    cy.get('input[placeholder="Hóspedes"]').type('2');

    // Intercepta disponibilidade
    cy.intercept('GET', '/api/disponibilidade*', {
      statusCode: 200,
      body: { availableRooms: [{ id: 1 }, { id: 2 }] }
    }).as('getDisp');

    // Checa disponibilidade
    cy.contains('Checar disponibilidade').click();
    cy.wait('@getDisp');
    cy.contains('Quarto selecionado está disponível').should('be.visible');

    // Intercepta criação de reserva
    cy.intercept('POST', '/api/reservas', {
      statusCode: 200,
      body: { id: 123, total: 300 }
    }).as('postReserva');

    // Intercepta PIX
    cy.intercept('POST', '/api/pagamento/pix', {
      statusCode: 200,
      body: {
        qr_code_base64: 'iVBORw0KGgoAAAAN',
        qr_code: '000201010212'
      }
    }).as('postPix');

    // Reserva
    cy.contains('Reservar').click();
    cy.wait('@postReserva');
    cy.contains('Reserva criada! ID 123').should('be.visible');

    // PIX exibido
    cy.contains('Pague com PIX').should('be.visible');
    cy.contains('Copia e Cola:').should('be.visible');
  });
});

