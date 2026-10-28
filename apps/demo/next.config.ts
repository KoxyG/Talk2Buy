import type { NextConfig } from "next";

const config: NextConfig = {
  devIndicators: false, // keeps the dev badge off the chat input
  agentRules: false, // stops next dev from writing AGENTS.md
};

export default config;
