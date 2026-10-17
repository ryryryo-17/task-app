import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mario: {
          sky: "#5c94fc",
          brick: "#c84c0c",
          ground: "#e45c10",
          coin: "#fbd000",
          pipe: "#00a800",
          pipeDark: "#006800",
          ink: "#101010",
        },
      },
      boxShadow: {
        block: "4px 4px 0 0 #101010",
        "block-sm": "2px 2px 0 0 #101010",
        // ハテナブロック（進行中）と空ブロック（完了）の立体感
        qblock:
          "inset -4px -4px 0 0 rgba(0,0,0,0.25), inset 4px 4px 0 0 rgba(255,255,255,0.55), 3px 3px 0 0 #101010",
        usedblock:
          "inset -4px -4px 0 0 rgba(0,0,0,0.25), inset 4px 4px 0 0 rgba(255,255,255,0.3), 3px 3px 0 0 #101010",
      },
      fontFamily: {
        pixel: ['"Courier New"', "Courier", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
