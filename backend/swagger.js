const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });

const doc = {
  info: {
    title: 'Pre-School Management System API',
    description: 'API Documentation for the Pre-School Management System backend',
    version: '1.0.0',
  },
  servers: [
    {
      url: 'https://malkakulufuturemind.me',
      description: 'Production Server'
    },
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      }
    }
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./src/app.js'];

/* NOTE: If you are using the express Router, you must pass in the 'endpointsFiles' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log('Swagger documentation has been generated successfully.');
});
