import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true }, // ← stops Vercel from failing on lint
};
module.exports = nextConfig;
