import express from "express";
import { fetchRooms } from "./room.controller.js";

const router = express.Router();

router.get("/", fetchRooms);

export default router;