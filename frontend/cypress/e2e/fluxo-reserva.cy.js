describe('Fluxo de reserva com disponibilidade e PIX', () => {
  it('lista quartos, checa disponibilidade, reserva e exibe PIX', () => {
    // Intercepta listagem de quartos
    cy.intercept('GET', '**/quartos', { fixture: 'rooms.json' }).as('getQuartos');

    cy.visit('/');
    cy.wait('@getQuartos');
    cy.contains('Quarto Luxo').should('be.visible');

    // Seleciona um quarto
    cy.contains('Selecionar').first().click();

    // Preenche dados
    cy.get('[data-cy="input-name"]').type('Cliente Teste');
    cy.get('[data-cy="input-email"]').type('cliente@teste.com');
    cy.get('[data-cy="input-checkin"]').type('2025-11-01');
    cy.get('[data-cy="input-checkout"]').type('2025-11-03');
    cy.get('[data-cy="input-guests"]').clear().type('2');

    // Intercepta disponibilidade
    cy.intercept('GET', '**/disponibilidade*', {
      statusCode: 200,
      body: { availableRooms: [{ id: 101 }, { id: 202 }] }
    }).as('getDisp');

    // Checa disponibilidade
    cy.get('[data-cy="check-availability"]').click();
    cy.wait('@getDisp');
    cy.contains('Quarto selecionado está disponível').should('be.visible');

    // Intercepta criação de reserva
    cy.intercept('POST', '**/reservas', {
      statusCode: 200,
      body: { id: 123, total: 350 }
    }).as('postReserva');

    // Intercepta PIX
    cy.intercept('POST', '**/pagamento/pix', {
      statusCode: 200,
      body: {
        qr_code_base64: 'iVBORw0KGgoAAAAN',
        qr_code: '000201010212'
      }
    }).as('postPix');

    // Reserva
    cy.get('[data-cy="reserve"]').click();
    cy.wait('@postReserva');
    cy.contains('Reserva criada! ID 123').should('be.visible');

    // PIX exibido
    cy.contains('Pague com PIX').should('be.visible');
    cy.contains('Copia e Cola:').should('be.visible');
  });
});
