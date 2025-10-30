# 🧱 Arquitetura DDD — Hotel Reserva Automática

## 🎯 Objetivo
Organizar o backend do sistema de reservas segundo princípios de *Domain-Driven Design*, para maior clareza, manutenibilidade e escalabilidade.

---

## 🧩 Estrutura de Pastas

backend/
└── src/
├── domain/
│ ├── entities/
│ │ ├── Quarto.js
│ │ └── Reserva.js
│ ├── services/
│ │ ├── CriarReservaService.js
│ │ ├── CancelarReservaService.js
│ │ └── PagarReservaService.js
│ └── value-objects/
│ └── Email.js
├── application/
│ └── usecases/
│ ├── CriarReservaUseCase.js
│ └── PagarReservaUseCase.js
├── infrastructure/
│ ├── repositories/
│ │ └── PrismaReservaRepository.js
│ └── external/
│ └── MercadoPagoAPI.js
└── presentation/
└── controllers/
├── ReservaController.js
├── QuartoController.js
└── PagamentoController.js




---

## 🧱 Entidades (Domain Layer)

### Quarto
```js
export class Quarto {
  constructor({ id, nome, descricao, precoNoite, capacidade, imagens }) {
    this.id = id;
    this.nome = nome;
    this.descricao = descricao;
    this.precoNoite = precoNoite;
    this.capacidade = capacidade;
    this.imagens = imagens;
  }
}


### Reserva

export class Reserva {
  constructor({ id, quartoId, nomeCliente, email, checkin, checkout, total }) {
    this.id = id;
    this.quartoId = quartoId;
    this.nomeCliente = nomeCliente;
    this.email = email;
    this.checkin = new Date(checkin);
    this.checkout = new Date(checkout);
    this.total = total;
    this.status = "pendente";
  }

  confirmarPagamento() {
    this.status = "confirmada";
  }

  cancelar() {
    this.status = "cancelada";
  }
}
