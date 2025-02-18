const isDev = import.meta.env.DEV;
const config = {
  apiUrl: isDev 
    ? `http://${window.location.hostname}:3001`
    : '' // Use environment variable or empty string for production
};

export default config; 