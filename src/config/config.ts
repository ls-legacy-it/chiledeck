const env = "prod";
const _config = {
  prod: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    MONGO_URI: process.env.MONGO_URI,
    MOCCA_SERVER: process.env.MOCCA_SERVER,
  },
};

export const config = _config[env];
