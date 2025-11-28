module.exports = {
    School: {
        type: 'object',
        properties: {
            _id: {
                type: 'string',
                description: 'The auto-generated id of the school',
                example: '5f8d0f3d4a7e3b2a1c7e2b1a'
            },
            name: {
                type: 'string',
                description: 'The name of the school',
                example: 'Greenwood High School'
            },
            code: {
                type: 'string',
                description: 'Unique code for the school',
                example: 'GHS-2023'
            },
            address: {
                type: 'string',
                description: 'Physical address of the school',
                example: '123 Education St, Nairobi, Kenya'
            },
            contactEmail: {
                type: 'string',
                format: 'email',
                description: 'Contact email for the school',
                example: 'info@greenwood.edu'
            },
            contactPhone: {
                type: 'string',
                description: 'Contact phone number',
                example: '+254712345678'
            },
            logo: {
                type: 'string',
                description: 'URL to the school logo',
                example: 'https://example.com/logo.png'
            },
            isActive: {
                type: 'boolean',
                description: 'Whether the school is active',
                default: true
            },
            createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Timestamp when the school was created'
            },
            updatedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Timestamp when the school was last updated'
            }
        }
    },
    Error: {
        type: 'object',
        properties: {
            success: {
                type: 'boolean',
                example: false
            },
            error: {
                type: 'string',
                description: 'Error message',
                example: 'School not found'
            }
        }
    },
    Notification: {
        type: 'object',
        properties: {
            message: {
                type: 'string',
                description: 'Notification message',
                example: 'New driver assigned to your school'
            },
            type: {
                type: 'string',
                enum: ['info', 'warning', 'error', 'success'],
                default: 'info',
                description: 'Type of notification'
            },
            timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'When the notification was sent'
            }
        }
    }
};
