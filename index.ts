import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { getUser, login, logout } from "./src/api/auth";
import { getCkrdUsers, getUsers } from "./src/api/user";
import {
  getBuyAndSell,
  getPremiumRequests,
  getReports,
  getStatistics,
  modifyPremiumRequest,
  updateBuyAndSell,
  uploadDocument,
  uploadPremContent,
} from "./src/api/management";

var bodyParser = require("body-parser");
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var cors = require("cors");

dotenv.config();

const app: Express = express();
const port = process?.env?.PORT || 8000;

app.use(bodyParser.json({ limit: "300mb" }));
app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.send("Unknown");
});

// User Management

app.get("/users", jsonParser, async (req: Request, res: Response) => {
  res.send(await getUsers());
});

app.get("/user", jsonParser, async (req: Request, res: Response) => {
  res.send(await getUser(req));
});

app.post("/login", jsonParser, async (req: Request, res: Response) => {
  res.send(await login(req.body.email, req.body.password));
});

app.post("/logout", jsonParser, async (req: Request, res: Response) => {
  res.send(await logout());
});

// Management

app.get("/ckrd-users", jsonParser, async (req: Request, res: Response) => {
  res.send(await getCkrdUsers());
});

app.get("/premium-requests", jsonParser, async (req: Request, res: Response) => {
  res.send(await getPremiumRequests());
});

app.post("/premium-requests", jsonParser, async (req: Request, res: Response) => {
  res.send(await modifyPremiumRequest(req.body.userId, req.body.status));
});

app.get("/buy-and-sell", jsonParser, async (req: Request, res: Response) => {
  res.send(await getBuyAndSell());
});

app.post("/buy-and-sell/:slug", jsonParser, async (req: Request, res: Response) => {
  res.send(await updateBuyAndSell(req.params.slug, req.body));
});

app.post("/upload-document", jsonParser, (req: Request, res: Response) => {
  uploadDocument(req.body.data).then((data) => res.send(data));
});

app.post("/premium-content", jsonParser, (req: Request, res: Response) => {
  uploadPremContent(req.body).then((data) => res.send(data));
});

app.get("/report/:slug", jsonParser, async (req: Request, res: Response) => {
  const subStr = req.params.slug.split("startDate=")[1];
  const subStr2 = subStr.split("&endDate=");
  res.send(await getReports(subStr2[0], subStr2[1]));
});

app.get("/statistics", jsonParser, async (req: Request, res: Response) => {
  res.send(await getStatistics());
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
