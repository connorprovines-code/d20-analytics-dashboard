/** @type {import('next').NextConfig} */
// Server rendering is required: data is fetched server-side and pages sit behind a login.
const nextConfig = {
  poweredByHeader: false,
};

module.exports = nextConfig;
