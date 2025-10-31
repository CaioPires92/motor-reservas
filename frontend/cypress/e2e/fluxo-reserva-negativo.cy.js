describe('Fluxo de reserva - cenários negativos', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/quartos', { fixture: 'rooms.json' }).as('getQuartos');
    cy.visit('/');
    cy.wait('@getQuartos');
  });

  it('Exibe erro quando quarto selecionado não está disponível', () => {
    // Seleciona primeiro quarto
    cy.get('[data-cy="room-card"]').should('have.length', 2);
    cy.get('[data-cy="select-room"]').first().click();

    // Preenche dados
    cy.get('[data-cy="input-name"]').type('Cliente Teste');
    cy.get('[data-cy="input-email"]').type('cliente@teste.com');
    cy.get('[data-cy="input-checkin"]').type('2024-12-01');
    cy.get('[data-cy="input-checkout"]').type('2024-12-03');
    cy.get('[data-cy="input-guests"]').clear().type('2');

    // Nenhuma disponibilidade
    cy.intercept('GET', '/api/disponibilidade*', {
      statusCode: 200,
      body: { availableRooms: [] }
    }).as('getDisp');
    cy.get('[data-cy="check-availability"]').click();
    cy.wait('@getDisp');

    // Deve exibir erro e desabilitar reservar
    cy.get('[data-cy="status-message"]').should('contain', 'não está disponível');
    cy.get('[data-cy="reserve"]').should('be.disabled');
  });

  it('Exibe erro quando criação da reserva falha', () => {
    // Seleciona primeiro quarto
    cy.get('[data-cy="select-room"]').first().click();

    // Preenche dados
    cy.get('[data-cy="input-name"]').type('Cliente Teste');
    cy.get('[data-cy="input-email"]').type('cliente@teste.com');
    cy.get('[data-cy="input-checkin"]').type('2024-12-01');
    cy.get('[data-cy="input-checkout"]').type('2024-12-03');
    cy.get('[data-cy="input-guests"]').clear().type('2');

    // Disponibilidade positiva para o quarto selecionado
    cy.intercept('GET', '/api/disponibilidade*', {
      statusCode: 200,
      body: { availableRooms: [{ id: 101 }] }
    }).as('getDispOk');
    cy.get('[data-cy="check-availability"]').click();
    cy.wait('@getDispOk');

    // Reserva falha
    cy.intercept('POST', '/api/reservas', {
      statusCode: 500,
      body: { error: 'Falha ao criar reserva' }
    }).as('postReservaFail');

    cy.get('[data-cy="reserve"]').click();
    cy.wait('@postReservaFail');
    cy.get('[data-cy="status-message"]').should('contain', 'Falha ao criar reserva');
  });

  it('Exibe erro quando geração de PIX falha', () => {
    // Seleciona primeiro quarto
    cy.get('[data-cy="select-room"]').first().click();

    // Preenche dados
    cy.get('[data-cy="input-name"]').type('Cliente Teste');
    cy.get('[data-cy="input-email"]').type('cliente@teste.com');
    cy.get('[data-cy="input-checkin"]').type('2024-12-05');
    cy.get('[data-cy="input-checkout"]').type('2024-12-07');
    cy.get('[data-cy="input-guests"]').clear().type('2');

    // Disponibilidade positiva para o quarto selecionado
    cy.intercept('GET', '/api/disponibilidade*', {
      statusCode: 200,
      body: { availableRooms: [{ id: 101 }] }
    }).as('getDispOk2');
    cy.get('[data-cy="check-availability"]').click();
    cy.wait('@getDispOk2');

    // Reserva OK
    cy.intercept('POST', '/api/reservas', {
      statusCode: 200,
      body: { id: 999, total: 350 }
    }).as('postReservaOk');

    // PIX falha
    cy.intercept('POST', '/api/pagamento/pix', {
      statusCode: 500,
      body: { error: 'Falha ao gerar PIX' }
    }).as('postPixFail');

    cy.get('[data-cy="reserve"]').click();
    cy.wait('@postReservaOk');
    cy.wait('@postPixFail');
    cy.get('[data-cy="status-message"]').should('contain', 'Falha ao gerar PIX');
  });
});

