import { app } from "./app.js";

const port = Number(process.env.PORT || 4200);
app.listen(port, () => {
  console.log(`Booking service running at http://localhost:${port}`);
});

