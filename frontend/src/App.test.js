import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));
jest.mock("react-ace", () => (props) => (
  <textarea
    aria-label={props.name}
    readOnly={props.readOnly}
    value={props.value}
    onChange={(event) => props.onChange?.(event.target.value)}
  />
));

const axios = require("axios");

test("renders the converter heading", async () => {
  axios.get.mockResolvedValue({
    data: {
      geminiConfigured: true,
      model: "gemini-1.5-flash",
    },
  });

  render(<App />);

  expect(
    await screen.findByText(/Code language conversion without the clutter/i)
  ).toBeInTheDocument();
  expect(await screen.findByText(/Configured/i)).toBeInTheDocument();
});
