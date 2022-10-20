import React from "react";
import ReactDOM from "react-dom/client";
import { auth } from "./Auth";

// Core First
const { default: CORE } = require("./core");

// React Parts
const { Timesheet } = require("./Timesheet");

// React Rendering Rules
const domContainer = document.querySelector("#timesheets-container");
const root = ReactDOM.createRoot(domContainer);
root.render(<Timesheet />);
