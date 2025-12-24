/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 确保服务端只使用一个 graphql 实例
      config.externals = [...(config.externals || []), 'graphql'];
    }
    
    // 确保所有地方使用同一个 graphql 模块
    config.resolve.alias = {
      ...config.resolve.alias,
      'graphql$': require.resolve('graphql'),
    };
    
    return config;
  },
}

module.exports = nextConfig

