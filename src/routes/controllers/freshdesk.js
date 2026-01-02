// src/routes/freshdeskRoutes.js
require("dotenv").config(); // Carga las variables de entorno
const express = require('express');
const { verifyToken } = require('./auth.js'); // Middleware para autenticación JWT
const multer = require('multer'); // Para manejar la carga de archivos
const axios = require('axios'); // Cliente HTTP para la API de Freshdesk
const FormData = require('form-data'); // Para construir cuerpos de solicitud multipart/form-data

// Obtiene credenciales de Freshdesk desde variables de entorno
const FRESHDESK_API_KEY = process.env.FRESHDESK_API_KEY;
const FRESHDESK_BASE_URL = process.env.FRESHDESK_DOMAIN;

const router = express.Router(); // Instancia del enrutador de Express

// Multer: almacena archivos en memoria temporalmente
const upload = multer({ storage: multer.memoryStorage() });

// GET /freshdesk/tickets: Obtiene tickets de Freshdesk según el rol del usuario
router.get('/tickets', verifyToken, async (req, res) => {
    try {
        const authHeader = Buffer.from(`${FRESHDESK_API_KEY}:X`).toString('base64');

        if (req.userRole === 'Cliente' && req.query.clientEmail) {
            // Lógica para rol 'Cliente': filtra tickets por el email global del cliente
            try {
                const freshdeskResponse = await axios.get(`${FRESHDESK_BASE_URL}/tickets`, {
                    headers: {
                        'Authorization': `Basic ${authHeader}`,
                        'Content-Type': 'application/json'
                    },
                    params: {
                        email: req.query.clientEmail,
                        page: parseInt(req.query.page) || 1
                    }
                });
                return res.json(freshdeskResponse.data);
            } catch (contactError) {
                // Manejo de errores específicos para cliente
                console.error('Error al obtener tickets del cliente en Freshdesk:', contactError.response ? JSON.stringify(contactError.response.data, null, 2) : contactError.message);
                const statusCode = contactError.response && contactError.response.status ? contactError.response.status : 500;
                return res.status(statusCode).json({ error: 'Error al buscar tickets del cliente en Freshdesk.', details: contactError.response ? contactError.response.data : contactError.message });
            }
        } else if (req.userRole === 'Admin') {
            // Lógica para rol 'Admin': permite obtener todos los tickets o aplicar filtros
            let adminParams = {
                page: parseInt(req.query.page) || 1,
                per_page: parseInt(req.query.per_page) || 30,
                order_by: req.query.order_by || 'updated_at',
                order_type: req.query.order_type || 'desc',
            };
            if (req.query.status) adminParams.status = parseInt(req.query.status);
            if (req.query.group_id) adminParams.group_id = parseInt(req.query.group_id);
            if (req.query.agent_id) adminParams.agent_id = parseInt(req.query.agent_id);

            if (req.query.requester_email) {
                // Admin: búsqueda de tickets por email de solicitante usando Freshdesk Query Language
                try {
                    const contactResponse = await axios.get(`${FRESHDESK_BASE_URL}/contacts?email=${req.query.requester_email}`, {
                        headers: {
                            'Authorization': `Basic ${authHeader}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (contactResponse.data && contactResponse.data.length > 0) {
                        const contactId = contactResponse.data[0].id;

                        let adminSearchQueryParts = [`email:"${req.query.requester_email}"`];
                        if (req.query.status) {
                            adminSearchQueryParts.push(`status:${parseInt(req.query.status)}`);
                        }

                        let adminFinalQueryString = adminSearchQueryParts.join(' AND ');

                        const adminSearchParams = {
                            query: adminFinalQueryString,
                            page: parseInt(req.query.page) || 1
                        };

                        const searchResponse = await axios.get(`${FRESHDESK_BASE_URL}/search/tickets`, {
                            headers: {
                                'Authorization': `Basic ${authHeader}`,
                                'Content-Type': 'application/json'
                            },
                            params: adminSearchParams
                        });
                        return res.json(searchResponse.data.results);
                    } else {
                        return res.json([]);
                    }
                } catch (searchContactError) {
                    // Manejo de errores de búsqueda para admin
                    console.error('Error al buscar contacto para admin por email:', searchContactError.response ? JSON.stringify(searchContactError.response.data, null, 2) : searchContactError.message);
                    const statusCode = searchContactError.response && searchContactError.response.status ? searchContactError.response.status : 500;
                    return res.status(statusCode).json({ error: 'Error al buscar tickets para el email de solicitante proporcionado.', details: searchContactError.response ? searchContactError.response.data : searchContactError.message });
                }
            } else {
                // Admin: obtener todos los tickets (con filtros generales)
                const freshdeskResponse = await axios.get(`${FRESHDESK_BASE_URL}/tickets`, {
                    headers: {
                        'Authorization': `Basic ${authHeader}`,
                        'Content-Type': 'application/json'
                    },
                    params: adminParams
                });
                return res.json(freshdeskResponse.data);
            }
        } else {
            // Rol de usuario no autorizado
            return res.status(403).json({ error: 'Acceso no permitido para este tipo de usuario o rol no reconocido.' });
        }

    } catch (error) {
        // Manejo de errores generales de la ruta
        console.error('Error general al obtener tickets de Freshdesk:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        const statusCode = error.response && error.response.status ? error.response.status : 500;
        res.status(statusCode).json({
            error: 'Error al obtener tickets de Freshdesk',
            details: error.response ? error.response.data : error.message
        });
    }
});


// POST /freshdesk/tickets: Crea un nuevo ticket en Freshdesk desde la Pagina web
router.post('/tickets', verifyToken, upload.array('uploads'), async (req, res) => {
    try {
        const {
            subject, description, email, priority, status, type, group_id, responder_id, company_id, custom_fields
        } = req.body;

        const files = req.files;

        // Validaciones básicas de campos requeridos
        if (!subject || !description || !email) {
            return res.status(400).json({ message: 'Asunto, descripción y email son campos requeridos para crear un ticket.' });
        }
        // Validar configuración de API
        if (!FRESHDESK_API_KEY || !FRESHDESK_BASE_URL) {
            return res.status(500).json({ message: 'Configuración de Freshdesk API incompleta en el servidor.' });
        }

        const freshdeskUrl = FRESHDESK_BASE_URL + '/tickets';
        const form = new FormData();

        // Añadir campos del ticket al formulario
        form.append('subject', subject);
        form.append('description', description);
        form.append('email', email);
        if (priority) form.append('priority', parseInt(priority));
        if (status) form.append('status', parseInt(status));
        if (type) form.append('type', type);
        if (group_id) form.append('group_id', parseInt(group_id));
        if (responder_id) form.append('responder_id', parseInt(responder_id));
        if (company_id) form.append('company_id', parseInt(company_id));
        form.append('custom_fields[cf_recibido_por]', 'Bot'); // Campo personalizado

        // Procesar y añadir campos personalizados
        if (custom_fields) {
            try {
                const parsedCustomFields = typeof custom_fields === 'string' ? JSON.parse(custom_fields) : custom_fields;
                for (const key in parsedCustomFields) {
                    if (Object.prototype.hasOwnProperty.call(parsedCustomFields, key)) {
                        form.append(`custom_fields[${key}]`, parsedCustomFields[key]);
                    }
                }
            } catch (err) {
                return res.status(400).json({ message: 'El formato de los campos personalizados no es un JSON válido.' });
            }
        }

        // Adjuntar archivos si existen
        if (files && files.length > 0) {
            files.forEach(file => {
                form.append('attachments[]', file.buffer, {
                    filename: file.originalname,
                    contentType: file.mimetype,
                    knownLength: file.size
                });
            });
        }

        const authHeader = 'Basic ' + Buffer.from(FRESHDESK_API_KEY + ':X').toString('base64');

        // Enviar la solicitud POST a Freshdesk
        const response = await axios.post(freshdeskUrl, form, {
            headers: {
                Authorization: authHeader,
                ...form.getHeaders() // Necesario para FormData
            },
            maxContentLength: Infinity, // Permitir contenido grande
            maxBodyLength: Infinity // Permitir cuerpo de solicitud grande
        });

        res.status(201).json({
            message: 'Ticket creado exitosamente en Freshdesk.',
            ticket: response.data
        });

    } catch (error) {
        // Manejo de errores de la creación de tickets
        if (error.response) {
            console.error('Error de Freshdesk:', JSON.stringify(error.response.data, null, 2));
            res.status(error.response.status).json({
                message: error.response.data.message || 'Error al comunicarse con Freshdesk.',
                errors: error.response.data.errors || error.response.data.description
            });
        } else {
            console.error('Error interno:', error);
            res.status(500).json({ message: 'Error interno del servidor al crear el ticket.' });
        }
    }
});

// GET /freshdesk/tickets/:id: Obtiene un ticket específico y sus conversaciones
router.get('/tickets/:id', verifyToken, async (req, res) => {
    const ticketId = req.params.id; // ID del ticket desde la URL

    try {
        const authHeader = Buffer.from(`${FRESHDESK_API_KEY}:X`).toString('base64');
        const headers = {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json'
        };

        // 1. Obtener detalles del ticket
        const ticketResponse = await axios.get(`${FRESHDESK_BASE_URL}/tickets/${ticketId}`, { headers });
        const ticket = ticketResponse.data;

        // 2. Obtener conversaciones (respuestas/notas) del ticket
        const conversationsResponse = await axios.get(`${FRESHDESK_BASE_URL}/tickets/${ticketId}/conversations`, { headers });
        const conversations = conversationsResponse.data;

        // Seguridad: Para clientes, verificar que el ticket les pertenezca
        if (req.userRole === 'Cliente') {
            // Asume que `req.query.clientEmail` es el email global del cliente asociado al token.
            // Si el email de login (del JWT) difiere del email global en Freshdesk, esta validación podría requerir ajuste.
            const contactResponse = await axios.get(`${FRESHDESK_BASE_URL}/contacts?email=${req.query.clientEmail}`, { headers });
            if (
                !contactResponse.data ||
                contactResponse.data.length === 0 ||
                contactResponse.data[0].id !== ticket.requester_id
            ) {
                return res.status(403).json({ error: 'Acceso denegado. Este ticket no pertenece a tu usuario.' });
            }
        }

        // Devolver detalles del ticket y sus conversaciones
        res.json({ ticket, conversations });

    } catch (error) {
        // Manejo de errores al obtener el ticket o sus conversaciones
        console.error(`Error al obtener ticket ${ticketId} de Freshdesk:`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        const statusCode = error.response && error.response.status ? error.response.status : 500;
        res.status(statusCode).json({
            error: `Error al obtener el ticket ${ticketId}`,
            details: error.response ? error.response.data : error.message
        });
    }
});

module.exports = router;