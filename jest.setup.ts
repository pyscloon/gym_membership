import dotenv from "dotenv";

const originalLog = console.log;
console.log = () => {};
dotenv.config({
  path: ".env.test",
  override: true,
});
console.log = originalLog;
