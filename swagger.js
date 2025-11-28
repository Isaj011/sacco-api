const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const schemas = require('./swaggerSchemas');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'School Transport API',
            version: '1.0.0',
            description: 'API for managing school transport systems'
        },
        servers: [
            {
                url: 'http://localhost:5000/api/v1',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: schemas
        },
        security: [{
            bearerAuth: []
        }]
    },
    apis: ['./routes/*.js']
};

const specs = swaggerJsDoc(options);

module.exports = (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};
