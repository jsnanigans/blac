import { Route, Routes } from "react-router-dom";
import Sandbox from "./Sandbox";
import React from "react";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Sandbox />} />
      <Route path="/sandbox" element={<Sandbox />} />
    </Routes>
  );
}
