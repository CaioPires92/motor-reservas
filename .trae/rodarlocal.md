# 1️⃣ Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev

# 2️⃣ Frontend
cd ../frontend
npm install
npm run dev



Acesse: http://localhost:5173

API: http://localhost:4000