/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
const axios = require('axios');

var persistenceAdapter = getPersistenceAdapter();

const moment = require('moment-timezone'); // will help us do all the birthday math

// i18n dependencies. i18n is the main module, sprintf allows us to include variables with '%s'.
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');

// We import language strings object containing all of our strings. 
// The keys for each string will then be referenced in our code
// e.g. requestAttributes.t('WELCOME_MSG')
const languageStrings = require('./localisation');

function getPersistenceAdapter() {
    // This function is an indirect way to detect if this is part of an Alexa-Hosted skill
    function isAlexaHosted() {
        return process.env.S3_PERSISTENCE_BUCKET ? true : false;
    }
    const tableName = 'citas_agendadas_table';
    if(isAlexaHosted()) {
        const {S3PersistenceAdapter} = require('ask-sdk-s3-persistence-adapter');
        return new S3PersistenceAdapter({ 
            bucketName: process.env.S3_PERSISTENCE_BUCKET
        });
    } else {
        // IMPORTANT: don't forget to give DynamoDB access to the role you're to run this lambda (IAM)
        const {DynamoDbPersistenceAdapter} = require('ask-sdk-dynamodb-persistence-adapter');
        return new DynamoDbPersistenceAdapter({ 
            tableName: tableName,
            createTable: true
        });
    }
}

const DOCUMENT_ID = "consultas";

var datasource = {
    "headlineExampleData": {
        "text": " La primera cita del dia de mañana es: <br>Nombre de la mascota: Loby, <br>Raza de la mascota: Husky, <br>Propietario: Adrián Hernández Bautista, <br>Teléfono del propietario: 7712443213, <br>Edad de la mascota: 1 año, <br>Sexo de la mascota: Macho, <br>Fecha de la cita: 2023-07-23, <br>Hora de la cita: 3:00PM, <br>Razón a la que acude el cachorro: Consulta general. <br>¿Quieres escuchar la siguiente cita?"
    }
};

const DOCUMENT_ID1 = "bienvenida";

var datasource1 = {
    "headlineExampleData": {
        "inicio": "¡Hola!, bienvenido a tu aplicación de consultas de citas, adrian te recordaré que tu fecha importante es el 29 de 07 de 2023. para conocer tus citas puedes iniciar sesión, antes debes decirme tu nombre, di algo como 'mi nombre de usuario es: '"
    }
};

var DOCUMENT_ID2 = "nocitas";

var datasource2 = {
    "headlineExampleData": {
        "inicio": "No hay más citas para mostrar."
    }
};

const DOCUMENT_ID3 = "hastapronto";

const datasource3 = {
    "headlineExampleData": {
        "inicio": "Hasta luego!."
    }
};

const DOCUMENT_ID4 = "ayuda";

const datasource4 = {
    "headlineExampleData": {
        "inicio": "'Puedes pedir citas de hoy', <br>'Puedes pedir citas del dia de mañana', <br>'Puedes pedir citas por dia, especificando el dia actual', <br>'Puedes pedir citas por el mes, diciendo 'citas del mes de julio', <br>'Puedes pedir citas por fecha, diciendo 'citas del 20 de agosto de 2023' <br>también puedo recordarte alguna fecha importante prueba diciendo <br>'el 5 de julio de 2023' y prueba decir 'cuanto falta'"
    }
};

var DOCUMENT_ID5 = "users";

const datasource5 = {
    "headlineExampleData": {
        "uss": "¡Bienvenido adrian!. a tu aplicación de consultas. Ahora dime algo como, <br>'Puedes pedir citas de hoy', <br>'Puedes pedir citas del dia de mañana', <br>'Puedes pedir citas por dia, especificando el dia actual', <br>'Puedes pedir citas por el mes, diciendo 'citas del mes de julio', <br>'Puedes pedir citas por fecha, diciendo 'citas del 20 de agosto de 2023' <br>también puedo recordarte alguna fecha importante prueba diciendo 'el 31 de julio de 2023' <br>y prueba decir 'cuanto falta para la fecha'"
    }
};

const createDirectivePayload = (aplDocumentId, dataSources = {}, tokenId = "documentToken") => {
    return {
        type: "Alexa.Presentation.APL.RenderDocument",
        token: tokenId,
        document: {
            type: "Link",
            src: "doc://alexa/apl/documents/" + aplDocumentId
        },
        datasources: dataSources
    }
};

var name = '';

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        const nameA = sessionAttributes['usuario'];
        const day = sessionAttributes['day'];
        const month = sessionAttributes['month'];
        const year = sessionAttributes['year'];
        
        let speechText = requestAttributes.t('WELCOME_MSG') + ' para conocer tus citas puedes iniciar sesión, antes debes decirme tu nombre, di algo como "mi nombre de usuario es: "';
        
        if(nameA && day && month && year){
        datasource1['headlineExampleData']['inicio'] = `¡Hola!, bienvenido a tu aplicación de consultas de citas,<br> ${nameA} te recordaré que tu fecha importante es el ${day} de ${month} de ${year}. <br>para conocer tus citas puedes iniciar sesión, antes debes decirme tu nombre, <br>di algo como "mi nombre de usuario es:" `    
        speechText = requestAttributes.t('WELCOME_MSG') + nameA+'.' + requestAttributes.t('REGISTER_RCO', day, month, year) + ' para conocer tus citas puedes iniciar sesión, antes debes decirme tu nombre, di algo como "mi nombre de usuario es: "';
         if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            // generate the APL RenderDocument directive that will be returned from your skill
            const aplDirective = createDirectivePayload(DOCUMENT_ID1, datasource1);
            // add the RenderDocument directive to the responseBuilder
            handlerInput.responseBuilder.addDirective(aplDirective);
        }
        }
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const RegistrarNombreUsuarioIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'RegistrarNombreUsuarioIntent';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const {intent} = handlerInput.requestEnvelope.request;

        const usuario = intent.slots.usuario.value;
        
         sessionAttributes['usuario'] = usuario;
      
         datasource5['headlineExampleData']['uss'] = `¡Bienvenido ${usuario}!. a tu aplicación de consultas. Ahora dime algo como, <br>'Puedes pedir citas de hoy', <br>'Puedes pedir citas del dia de mañana', <br>'Puedes pedir citas por dia, especificando el dia actual', <br>'Puedes pedir citas por el mes, diciendo 'citas del mes de julio', <br>'Puedes pedir citas por fecha, diciendo 'citas del 20 de agosto de 2023' <br>también puedo recordarte alguna fecha importante prueba diciendo 'el 31 de julio de 2023' <br>y prueba decir 'cuanto falta para la fecha'`
        
         if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            // generate the APL RenderDocument directive that will be returned from your skill
            const aplDirective = createDirectivePayload(DOCUMENT_ID5, datasource5);
            // add the RenderDocument directive to the responseBuilder
            handlerInput.responseBuilder.addDirective(aplDirective);
        } 
     
        return handlerInput.responseBuilder
            .speak(requestAttributes.t('REGISTER_MSG', usuario))
            .reprompt(requestAttributes.t('HELP_MSG'))
            .getResponse();
    }
};

const RegisterCitasFechaIntentIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RegisterCitasFechaIntent';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const {intent} = handlerInput.requestEnvelope.request;

        const day = intent.slots.day.value;
        const month = intent.slots.month.resolutions.resolutionsPerAuthority[0].values[0].value.id;
        const monthName = intent.slots.month.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        const year = intent.slots.year.value;
        
        sessionAttributes['day'] = day;
        sessionAttributes['month'] = month;
        sessionAttributes['monthName'] = monthName;
        sessionAttributes['year'] = year;

        return handlerInput.responseBuilder
            .speak(requestAttributes.t('REGISTER_RCO', day, monthName, year) + requestAttributes.t('HELP_MSG'))
            .reprompt(requestAttributes.t('HELP_MSG'))
            .getResponse();
    }
};

const TimeDayCitasIntentIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'TimeDayCitasIntent';
    },
    async handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();

        const day = sessionAttributes['day'];
        const month = sessionAttributes['month'];
        const year = sessionAttributes['year'];
        
        let speechText;
        if(day && month && year){    
            const timezone = 'America/Mexico_City'; // we'll change this later to retrieve the timezone from the device
            const today = moment().tz(timezone).startOf('day');
            const wasBorn = moment(`${month}/${day}/${year}`, "MM/DD/YYYY").tz(timezone).startOf('day');
            const nextBirthday = moment(`${month}/${day}/${today.year()}`, "MM/DD/YYYY").tz(timezone).startOf('day');
        
            const daysLeft = nextBirthday.startOf('day').diff(today, 'days'); // same days returns 0
             speechText = requestAttributes.t('SAY_MSG', daysLeft);
            if(daysLeft === 0) {
                    speechText = requestAttributes.t('GREET_MSG');
                }
                speechText += requestAttributes.t('OVERWRITE_MSG');
            } else {
                speechText = requestAttributes.t('MISSING_MSG');
            }
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(requestAttributes.t('HELP_MSG'))
            .getResponse();
    }
};

const ConsultarCitasHoyIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConsultarCitasHoyIntent';
  },
  async handle(handlerInput) {
    const fechaHoy = getFechaActualMexico();
    try {
      const response = await axios.get(`https://citas.proyectowebuni.com/api/buscar-fechas?fecha=${fechaHoy}`);
      const registros = response.data;
        // Utiliza el método sort() para ordenar los registros por hora
        registros.sort((registro1, registro2) => {
          const hora1 = registro1.hora_cita;
          const hora2 = registro2.hora_cita;
    
          if (hora1 < hora2) {
            return -1; // Si hora1 es menor, debe ir antes en la lista
          } else if (hora1 > hora2) {
            return 1; // Si hora1 es mayor, debe ir después en la lista
          }
    
          return 0; // Si las horas son iguales, el orden no importa
        });
        
      let speechText = '';
      if (registros.length > 0) {
        // Guardar los registros en el session attributes
        handlerInput.attributesManager.setSessionAttributes({ registros, currentIndex: 0 });
        
        const primerRegistro = registros[0];
        datasource['headlineExampleData']['text'] = `La primera cita del dia de hoy ${fechaHoy} es: <br>Nombre de la mascota: ${primerRegistro.nombre_mascota}, <br>Raza de la mascota: ${primerRegistro.raza_mascota},  <br>Propietario: ${primerRegistro.nombre_propietario},  <br>Teléfono del propietario: ${convertirNumeroEnPalabras(primerRegistro.telefono_propietario)},  <br>Edad de la mascota: ${convertirEdadLegible(primerRegistro.edad_mascota)},  <br>Sexo de la mascota: ${primerRegistro.sexo_mascota},  <br>Fecha de la cita: ${primerRegistro.fecha_cita},  <br>Hora de la cita: ${convertirHoraLegible(primerRegistro.hora_cita)},  <br>Razón a la que acude el cachorro: ${primerRegistro.razon_cita}.  <br>¿Quieres escuchar la siguiente cita?`
        speechText = `La primera cita del dia de hoy ${fechaHoy} es: Nombre de la mascota: ${primerRegistro.nombre_mascota}, Raza de la mascota: ${primerRegistro.raza_mascota}, Propietario: ${primerRegistro.nombre_propietario}, Teléfono del propietario: ${convertirNumeroEnPalabras(primerRegistro.telefono_propietario)}, Edad de la mascota: ${convertirEdadLegible(primerRegistro.edad_mascota)}, Sexo de la mascota: ${primerRegistro.sexo_mascota}, Fecha de la cita: ${primerRegistro.fecha_cita}, Hora de la cita: ${convertirHoraLegible(primerRegistro.hora_cita)}, Razón a la que acude el cachorro: ${primerRegistro.razon_cita}. ¿Quieres escuchar la siguiente cita?`;
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            // generate the APL RenderDocument directive that will be returned from your skill
            const aplDirective = createDirectivePayload(DOCUMENT_ID, datasource);
            // add the RenderDocument directive to the responseBuilder
            handlerInput.responseBuilder.addDirective(aplDirective);
        }    
      } else {
        speechText = `No se encontraron citas para el dia de hoy ${fechaHoy}.`;
      }
      
      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    } catch (error) {
      console.error('Error al obtener los citas:', error);
      
      return handlerInput.responseBuilder
        .speak('Lo siento, ocurrió un error al obtener los registros. Por favor, intenta nuevamente más tarde.')
        .getResponse();
    }
  }
};

const ConsultarCitasManaIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConsultarCitasManaIntent';
  },
  async handle(handlerInput) {
    const fechaDeManana = getTomorrowDateInMexico();
    try {
        const response = await axios.get('https://citas.proyectowebuni.com/api/citas-de-manana', {
        params: {
          fecha: fechaDeManana
        }
      });
      const registros = response.data;
        // Utiliza el método sort() para ordenar los registros por hora
        registros.sort((registro1, registro2) => {
          const hora1 = registro1.hora_cita;
          const hora2 = registro2.hora_cita;
    
          if (hora1 < hora2) {
            return -1; // Si hora1 es menor, debe ir antes en la lista
          } else if (hora1 > hora2) {
            return 1; // Si hora1 es mayor, debe ir después en la lista
          }
    
          return 0; // Si las horas son iguales, el orden no importa
        });
        
      let speechText = '';
      if (registros.length > 0) {
        // Guardar los registros en el session attributes
        handlerInput.attributesManager.setSessionAttributes({ registros, currentIndex: 0 });
        const primerRegistro = registros[0];
        datasource['headlineExampleData']['text'] = `La primera cita del dia de mañana ${fechaDeManana} es: <br>Nombre de la mascota: ${primerRegistro.nombre_mascota}, <br>Raza de la mascota: ${primerRegistro.raza_mascota},  <br>Propietario: ${primerRegistro.nombre_propietario},  <br>Teléfono del propietario: ${convertirNumeroEnPalabras(primerRegistro.telefono_propietario)},  <br>Edad de la mascota: ${convertirEdadLegible(primerRegistro.edad_mascota)},  <br>Sexo de la mascota: ${primerRegistro.sexo_mascota},  <br>Fecha de la cita: ${primerRegistro.fecha_cita},  <br>Hora de la cita: ${convertirHoraLegible(primerRegistro.hora_cita)},  <br>Razón a la que acude el cachorro: ${primerRegistro.razon_cita}.  <br>¿Quieres escuchar la siguiente cita?`
        speechText = `La primera cita del dia de mañana ${fechaDeManana} es: Nombre de la mascota: ${primerRegistro.nombre_mascota}, Raza de la mascota: ${primerRegistro.raza_mascota}, Propietario: ${primerRegistro.nombre_propietario}, Teléfono del propietario: ${convertirNumeroEnPalabras(primerRegistro.telefono_propietario)}, Edad de la mascota: ${convertirEdadLegible(primerRegistro.edad_mascota)}, Sexo de la mascota: ${primerRegistro.sexo_mascota}, Fecha de la cita: ${primerRegistro.fecha_cita}, Hora de la cita: ${convertirHoraLegible(primerRegistro.hora_cita)}, Razón a la que acude el cachorro: ${primerRegistro.razon_cita}. ¿Quieres escuchar la siguiente cita?`;
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            // generate the APL RenderDocument directive that will be returned from your skill
            const aplDirective = createDirectivePayload(DOCUMENT_ID, datasource);
            // add the RenderDocument directive to the responseBuilder
            handlerInput.responseBuilder.addDirective(aplDirective);
        }  
      } else {
        speechText = `No se encontraron citas para el dia de mañana  ${fechaDeManana}.`;
      }
      
      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    } catch (error) {
      console.error('Error al obtener los citas:', error);
      
      return handlerInput.responseBuilder
        .speak('Lo siento, ocurrió un error al obtener los registros. Por favor, intenta nuevamente más tarde.')
        .getResponse();
    }
  }
};

const ConsultarCitaDiaIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConsultarCitaDiaIntent';
  },
  async handle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    const diaUser = request.intent.slots.day.value;
    
    try {
      const response = await axios.get(`https://citas.proyectowebuni.com/api/citas-dia?dia=${diaUser}`);
      const registros = response.data;
       // Utiliza el método sort() para ordenar los registros por hora
        registros.sort((registro1, registro2) => {
          const hora1 = registro1.hora_cita;
          const hora2 = registro2.hora_cita;
    
          if (hora1 < hora2) {
            return -1; // Si hora1 es menor, debe ir antes en la lista
          } else if (hora1 > hora2) {
            return 1; // Si hora1 es mayor, debe ir después en la lista
          }
    
          return 0; // Si las horas son iguales, el orden no importa
        });
    
      let speechText = '';
      if (registros.length > 0) {
        // Guardar los registros en el session attributes
        handlerInput.attributesManager.setSessionAttributes({ registros, currentIndex: 0 });
        
        const primerRegistro = registros[0];
        datasource['headlineExampleData']['text'] = `La primera cita del dia ${diaUser} es: <br>Nombre de la mascota: ${primerRegistro.nombre_mascota}, <br>Raza de la mascota: ${primerRegistro.raza_mascota},  <br>Propietario: ${primerRegistro.nombre_propietario},  <br>Teléfono del propietario: ${convertirNumeroEnPalabras(primerRegistro.telefono_propietario)},  <br>Edad de la mascota: ${convertirEdadLegible(primerRegistro.edad_mascota)},  <br>Sexo de la mascota: ${primerRegistro.sexo_mascota},  <br>Fecha de la cita: ${primerRegistro.fecha_cita},  <br>Hora de la cita: ${convertirHoraLegible(primerRegistro.hora_cita)},  <br>Razón a la que acude el cachorro: ${primerRegistro.razon_cita}.  <br>¿Quieres escuchar la siguiente cita?`
        speechText = `La primera cita del dia ${diaUser} es: Nombre de la mascota: ${primerRegistro.nombre_mascota}, Raza de la mascota: ${primerRegistro.raza_mascota}, Propietario: ${primerRegistro.nombre_propietario}, Teléfono del propietario: ${convertirNumeroEnPalabras(primerRegistro.telefono_propietario)}, Edad de la mascota: ${convertirEdadLegible(primerRegistro.edad_mascota)}, Sexo de la mascota: ${primerRegistro.sexo_mascota}, Fecha de la cita: ${primerRegistro.fecha_cita}, Hora de la cita: ${convertirHoraLegible(primerRegistro.hora_cita)}, Razón a la que acude el cachorro: ${primerRegistro.razon_cita}. ¿Quieres escuchar la siguiente cita?`;
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            // generate the APL RenderDocument directive that will be returned from your skill
            const aplDirective = createDirectivePayload(DOCUMENT_ID, datasource);
            // add the RenderDocument directive to the responseBuilder
            handlerInput.responseBuilder.addDirective(aplDirective);
        }   
      } else {
        speechText = `No se encontraron citas para el mes de ${diaUser}.`;
      }
      
      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    } catch (error) {
      console.error('Error al obtener los citas:', error);
      
      return handlerInput.responseBuilder
        .speak('Lo siento, ocurrió un error al obtener los registros. Por favor, intenta nuevamente más tarde.')
        .getResponse();
    }
  }
};

const ConsultarCitasMesIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConsultarCitasMesIntent';
  },
  async handle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    const mesUser = request.intent.slots.mes.value;
    
    try {
      const response = await axios.get(`https://citas.proyectowebuni.com/api/cita-del-mes?mes=${mesUser}`);
      const registros = response.data;
      
        // Utiliza el método sort() para ordenar los registros por hora
        registros.sort((registro1, registro2) => {
          const hora1 = registro1.hora_cita;
          const hora2 = registro2.hora_cita;
    
          if (hora1 < hora2) {
            return -1; // Si hora1 es menor, debe ir antes en la lista
          } else if (hora1 > hora2) {
            return 1; // Si hora1 es mayor, debe ir después en la lista
          }
    
          return 0; // Si las horas son iguales, el orden no importa
        });
        
        registros.sort((a, b) => {
        const diaA = new Date(a.fecha_cita).getDate();
        const diaB = new Date(b.fecha_cita).getDate();
    
        return diaA - diaB;
        });
        
      let speechText = '';
      if (registros.length > 0) {
        // Guardar los registros en el session attributes
        handlerInput.attributesManager.setSessionAttributes({ registros, currentIndex: 0 });
       
        const primerRegistro = registros[0];
        datasource['headlineExampleData']['text'] = `La primera cita del mes de ${mesUser} es: <br>Nombre de la mascota: ${primerRegistro.nombre_mascota}, <br>Raza de la mascota: ${primerRegistro.raza_mascota},  <br>Propietario: ${primerRegistro.nombre_propietario},  <br>Teléfono del propietario: ${convertirNumeroEnPalabras(primerRegistro.telefono_propietario)},  <br>Edad de la mascota: ${convertirEdadLegible(primerRegistro.edad_mascota)},  <br>Sexo de la mascota: ${primerRegistro.sexo_mascota},  <br>Fecha de la cita: ${primerRegistro.fecha_cita},  <br>Hora de la cita: ${convertirHoraLegible(primerRegistro.hora_cita)},  <br>Razón a la que acude el cachorro: ${primerRegistro.razon_cita}.  <br>¿Quieres escuchar la siguiente cita?`
        speechText = `La primera cita del mes de ${mesUser} es: Nombre de la mascota: ${primerRegistro.nombre_mascota}, Raza de la mascota: ${primerRegistro.raza_mascota}, Propietario: ${primerRegistro.nombre_propietario}, Teléfono del propietario: ${convertirNumeroEnPalabras(primerRegistro.telefono_propietario)}, Edad de la mascota: ${convertirEdadLegible(primerRegistro.edad_mascota)}, Sexo de la mascota: ${primerRegistro.sexo_mascota}, Fecha de la cita: ${primerRegistro.fecha_cita}, Hora de la cita: ${convertirHoraLegible(primerRegistro.hora_cita)}, Razón a la que acude el cachorro: ${primerRegistro.razon_cita}. ¿Quieres escuchar la siguiente cita?`;
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            // generate the APL RenderDocument directive that will be returned from your skill
            const aplDirective = createDirectivePayload(DOCUMENT_ID, datasource);
            // add the RenderDocument directive to the responseBuilder
            handlerInput.responseBuilder.addDirective(aplDirective);
        }   
      } else {
        speechText = `No se encontraron citas para el mes de ${mesUser}.`;
      }
      
      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    } catch (error) {
      console.error('Error al obtener los citas:', error);
      
      return handlerInput.responseBuilder
        .speak('Lo siento, ocurrió un error al obtener los registros. Por favor, intenta nuevamente más tarde.')
        .getResponse();
    }
  }
};

const ConsultarCitasFechasIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConsultarCitaFechasIntent';
  },
  async handle(handlerInput) {
   const fechaUser = '2023-08-20';
    try {
      const response = await axios.get(`https://citas.proyectowebuni.com/api/buscar-fechas?fecha=${fechaUser}`);
      const registros = response.data;
        // Utiliza el método sort() para ordenar los registros por hora
        registros.sort((registro1, registro2) => {
          const hora1 = registro1.hora_cita;
          const hora2 = registro2.hora_cita;
    
          if (hora1 < hora2) {
            return -1; // Si hora1 es menor, debe ir antes en la lista
          } else if (hora1 > hora2) {
            return 1; // Si hora1 es mayor, debe ir después en la lista
          }
    
          return 0; // Si las horas son iguales, el orden no importa
        });
        
      let speechText = '';
      if (registros.length > 0) {
        // Guardar los registros en el session attributes
        handlerInput.attributesManager.setSessionAttributes({ registros, currentIndex: 0 });
        
        const primerRegistro = registros[0];
        datasource['headlineExampleData']['text'] = `La primera cita de la fecha ${fechaUser} es: <br>Nombre de la mascota: ${primerRegistro.nombre_mascota}, <br>Raza de la mascota: ${primerRegistro.raza_mascota},  <br>Propietario: ${primerRegistro.nombre_propietario},  <br>Teléfono del propietario: ${convertirNumeroEnPalabras(primerRegistro.telefono_propietario)},  <br>Edad de la mascota: ${convertirEdadLegible(primerRegistro.edad_mascota)},  <br>Sexo de la mascota: ${primerRegistro.sexo_mascota},  <br>Fecha de la cita: ${primerRegistro.fecha_cita},  <br>Hora de la cita: ${convertirHoraLegible(primerRegistro.hora_cita)},  <br>Razón a la que acude el cachorro: ${primerRegistro.razon_cita}.  <br>¿Quieres escuchar la siguiente cita?`
        speechText = `La primera cita de la fecha ${fechaUser} es: Nombre de la mascota: ${primerRegistro.nombre_mascota}, Raza de la mascota: ${primerRegistro.raza_mascota}, Propietario: ${primerRegistro.nombre_propietario}, Teléfono del propietario: ${convertirNumeroEnPalabras(primerRegistro.telefono_propietario)}, Edad de la mascota: ${convertirEdadLegible(primerRegistro.edad_mascota)}, Sexo de la mascota: ${primerRegistro.sexo_mascota}, Fecha de la cita: ${primerRegistro.fecha_cita}, Hora de la cita: ${convertirHoraLegible(primerRegistro.hora_cita)}, Razón a la que acude el cachorro: ${primerRegistro.razon_cita}. ¿Quieres escuchar la siguiente cita?`;
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            // generate the APL RenderDocument directive that will be returned from your skill
            const aplDirective = createDirectivePayload(DOCUMENT_ID, datasource);
            // add the RenderDocument directive to the responseBuilder
            handlerInput.responseBuilder.addDirective(aplDirective);
        }  
      } else {
        speechText = `No se encontraron citas de la fecha ${fechaUser}.`;
      }
      
      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    } catch (error) {
      console.error('Error al obtener los citas:', error);
      
      return handlerInput.responseBuilder
        .speak('Lo siento, ocurrió un error al obtener los registros. Por favor, intenta nuevamente más tarde.')
        .getResponse();
    }
  }
};

const ObtenerSiguienteRegistroIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ObtenerSiguienteRegistroIntent';
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const { registros, currentIndex } = sessionAttributes;
    
    if (!registros || currentIndex === undefined) {
      return handlerInput.responseBuilder
        .speak('No hay citas para mostrar.')
        .getResponse();
    }
    
    const nextIndex = currentIndex + 1;
    if (nextIndex < registros.length) {
      const siguienteRegistro = registros[nextIndex];
      sessionAttributes.currentIndex = nextIndex;
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
      datasource['headlineExampleData']['text'] = `La siguiente cita se muestra de acuerdo a la hora establecida: <br>Nombre de la mascota: ${siguienteRegistro.nombre_mascota}, <br>Raza de la mascota: ${siguienteRegistro.raza_mascota},  <br>Propietario: ${siguienteRegistro.nombre_propietario},  <br>Teléfono del propietario: ${convertirNumeroEnPalabras(siguienteRegistro.telefono_propietario)},  <br>Edad de la mascota: ${convertirEdadLegible(siguienteRegistro.edad_mascota)},  <br>Sexo de la mascota: ${siguienteRegistro.sexo_mascota},  <br>Fecha de la cita: ${siguienteRegistro.fecha_cita},  <br>Hora de la cita: ${convertirHoraLegible(siguienteRegistro.hora_cita)},  <br>Razón a la que acude el cachorro: ${siguienteRegistro.razon_cita}.  <br>¿Quieres escuchar la siguiente cita?`
      const speechText = `La siguiente cita se muestra de acuerdo a la hora establecida: Nombre de la mascota: ${siguienteRegistro.nombre_mascota}, Raza de la mascota: ${siguienteRegistro.raza_mascota}, Propietario: ${siguienteRegistro.nombre_propietario}, Teléfono del propietario: ${convertirNumeroEnPalabras(siguienteRegistro.telefono_propietario)}, Edad de la mascota: ${convertirEdadLegible(siguienteRegistro.edad_mascota)}, Sexo de la mascota: ${siguienteRegistro.sexo_mascota}, Fecha de la cita: ${siguienteRegistro.fecha_cita}, Hora de la cita:  ${convertirHoraLegible(siguienteRegistro.hora_cita)}, Razón a la que acude el cachorro: ${siguienteRegistro.razon_cita}. ¿Quieres escuchar la siguiente cita?`;
      if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            // generate the APL RenderDocument directive that will be returned from your skill
            const aplDirective = createDirectivePayload(DOCUMENT_ID, datasource);
            // add the RenderDocument directive to the responseBuilder
            handlerInput.responseBuilder.addDirective(aplDirective);
      }  
      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    } else {
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
                // generate the APL RenderDocument directive that will be returned from your skill
                const aplDirective = createDirectivePayload(DOCUMENT_ID2, datasource2);
                // add the RenderDocument directive to the responseBuilder
                handlerInput.responseBuilder.addDirective(aplDirective);
        }  
      return handlerInput.responseBuilder
        .speak('No hay más citas para mostrar.')
        .getResponse();
    }
  }
};

const EliminarRegistroIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'EliminarRegistroIntent';
  },
  async handle(handlerInput) {
    
    try {
      const response = await axios.get(`https://citas.proyectowebuni.com/api/citas`);
      const datos = response.data;
      
      let speechText = '';
       if (datos.length > 0) {
      const primerRegistro = datos[0];
 
       handlerInput.attributesManager.setSessionAttributes({ registroIdAEliminar: primerRegistro.id });
       
       speechText = `La primera cita: ${primerRegistro.id}, Nombre de la mascota: ${primerRegistro.nombre_mascota}, Raza de la mascota: ${primerRegistro.raza_mascota}, Propietario: ${primerRegistro.nombre_propietario}, Teléfono del propietario: ${convertirNumeroEnPalabras(primerRegistro.telefono_propietario)}, Edad de la mascota: ${convertirEdadLegible(primerRegistro.edad_mascota)}, Sexo de la mascota: ${primerRegistro.sexo_mascota}, Fecha de la cita: ${primerRegistro.fecha_cita}, Hora de la cita: ${convertirHoraLegible(primerRegistro.hora_cita)}, Razón a la que acude el cachorro: ${primerRegistro.razon_cita}. ¿Quieres escuchar la siguiente cita?`;
          
       } else {
        speechText = `No se encontraron citas.`;
      }
      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    } catch (error) {
      console.error('Error al obtener los citas:', error);
      
      return handlerInput.responseBuilder
        .speak('Lo siento, ocurrió un error al obtener los registros. Por favor, intenta nuevamente más tarde.')
        .getResponse();
    }
  }
};

const ConfirmarEliminacionIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConfirmarEliminacionIntent';
  },
  async handle(handlerInput) {
    const confirmacion = Alexa.getSlotValue(handlerInput.requestEnvelope, 'Confirmacion');
    
    if (confirmacion === 'sí') {
      // Obtiene el ID del registro a eliminar del atributo de sesión
      const attributesManager = handlerInput.attributesManager;
      const sessionAttributes = attributesManager.getSessionAttributes();
      const registroIdAEliminar = sessionAttributes.registroIdAEliminar;
      
      if (registroIdAEliminar) {
        try {
          // Realiza la llamada a la API para eliminar el registro
          await axios.delete(`https://citas.proyectowebuni.com/api/citas/${registroIdAEliminar}`);
          
          // Elimina el atributo de sesión para evitar futuras interacciones no deseadas
          attributesManager.deleteSessionAttributes();
          
          const speechText = 'El registro ha sido eliminado exitosamente.';
          
          return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
        } catch (error) {
          console.error('Error al eliminar registro:', error);
          
          return handlerInput.responseBuilder
            .speak('Lo siento, ocurrió un error al eliminar el registro. Por favor, intenta nuevamente más tarde.')
            .getResponse();
        }
      } else {
        // Si el atributo de sesión con el ID del registro no está presente, manejar el error
        const speechText = 'No se encontró el registro para eliminar. Por favor, intenta nuevamente.';
        
        return handlerInput.responseBuilder
          .speak(speechText)
          .getResponse();
      }
    } else {
      // Si el usuario no confirma la eliminación, puedes proporcionar un mensaje de despedida o simplemente finalizar la conversación
      const speechText = 'Entendido, no se eliminará el registro.';
      
      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    }
  }
};

function getFechaActualMexico() {
  const mexicoTimeZone = 'America/Mexico_City';
  return moment().tz(mexicoTimeZone).format('YYYY-MM-DD');
}

function getTomorrowDateInMexico() {
  // Definimos la zona horaria de México (Ciudad de México)
  const timezone = 'America/Mexico_City';
  
  // Obtenemos la fecha actual en la zona horaria de México
  const today = moment.tz(timezone);
  
  // Obtenemos la fecha del día de mañana sumándole 1 día a la fecha actual
  const tomorrow = today.clone().add(1, 'day');
  
  // Formateamos la fecha en el formato deseado (sin la hora)
  const formattedDate = tomorrow.format('YYYY-MM-DD');
  
  return formattedDate;
}

function convertirHoraLegible(hora24) {
  // Divide la hora y los minutos
  const [hora, minutos] = hora24.split(':');

  // Convierte la hora a un número entero
  const horaInt = parseInt(hora, 10);

  // Determina si es AM o PM
  const periodo = horaInt >= 12 ? 'PM' : 'AM';

  // Calcula la hora en formato de 12 horas
  const hora12 = horaInt % 12 || 12;

  // Devuelve la hora en formato de 12 horas
  return `${hora12}:${minutos} ${periodo}`;
}

function convertirNumeroEnPalabras(numero) {
  const digitos = {
    '0': 'cero',
    '1': 'uno',
    '2': 'dos',
    '3': 'tres',
    '4': 'cuatro',
    '5': 'cinco',
    '6': 'seis',
    '7': 'siete',
    '8': 'ocho',
    '9': 'nueve'
  };

  let numeroConvertido = '';
  for (let i = 0; i < numero.length; i++) {
    const digito = numero[i];
    if (digitos.hasOwnProperty(digito)) {
      numeroConvertido += digitos[digito] + ' ';
    } else {
      numeroConvertido += digito + ' ';
    }
  }

  return numeroConvertido.trim();
}

function convertirEdadLegible(edad) {
  let edadLegible = '';

  if (edad === 1) {
    edadLegible = '1 año';
  } else if (edad > 1) {
    edadLegible = `${edad} años`;
  } else {
    edadLegible = 'menos de 1 año';
  }

  return edadLegible;
}

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const speechText = requestAttributes.t('HELP_MSG');
        
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            // generate the APL RenderDocument directive that will be returned from your skill
            const aplDirective = createDirectivePayload(DOCUMENT_ID4, datasource4);
            // add the RenderDocument directive to the responseBuilder
            handlerInput.responseBuilder.addDirective(aplDirective);
        }


        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const speechText = requestAttributes.t('GOODBYE_MSG');
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            // generate the APL RenderDocument directive that will be returned from your skill
            const aplDirective = createDirectivePayload(DOCUMENT_ID3, datasource3);
            // add the RenderDocument directive to the responseBuilder
            handlerInput.responseBuilder.addDirective(aplDirective);
        }
        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const speechText = requestAttributes.t('FALLBACK_MSG');

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const intentName = handlerInput.requestEnvelope.request.intent.name;
        const speechText = requestAttributes.t('REFLECTOR_MSG', intentName);

        return handlerInput.responseBuilder
            .speak(speechText)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const speechText = requestAttributes.t('ERROR_MSG');
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

// This request interceptor will log all incoming requests to this lambda
const LoggingRequestInterceptor = {
    process(handlerInput) {
        console.log(`Incoming request: ${JSON.stringify(handlerInput.requestEnvelope.request)}`);
    }
};

// This response interceptor will log all outgoing responses of this lambda
const LoggingResponseInterceptor = {
    process(handlerInput, response) {
      console.log(`Outgoing response: ${JSON.stringify(response)}`);
    }
};

// This request interceptor will bind a translation function 't' to the requestAttributes.
const LocalizationRequestInterceptor = {
  process(handlerInput) {
    const localizationClient = i18n.use(sprintf).init({
      lng: handlerInput.requestEnvelope.request.locale,
      overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
      resources: languageStrings,
      returnObjects: true
    });
    const attributes = handlerInput.attributesManager.getRequestAttributes();
    attributes.t = function (...args) {
      return localizationClient.t(...args);
    }
  }
};

const LoadAttributesRequestInterceptor = {
    async process(handlerInput) {
        if(handlerInput.requestEnvelope.session['new']){ //is this a new session?
            const {attributesManager} = handlerInput;
            const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
            //copy persistent attribute to session attributes
            handlerInput.attributesManager.setSessionAttributes(persistentAttributes);
        }
    }
};

const SaveAttributesResponseInterceptor = {
    async process(handlerInput, response) {
        const {attributesManager} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const shouldEndSession = (typeof response.shouldEndSession === "undefined" ? true : response.shouldEndSession);//is this a session end?
        if(shouldEndSession || handlerInput.requestEnvelope.request.type === 'SessionEndedRequest') { // skill was stopped or timed out            
            attributesManager.setPersistentAttributes(sessionAttributes);
            await attributesManager.savePersistentAttributes();
        }
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        RegistrarNombreUsuarioIntentHandler,
        RegisterCitasFechaIntentIntentHandler,
        TimeDayCitasIntentIntentHandler,
        ConsultarCitasHoyIntentHandler,
        ConsultarCitasManaIntentHandler,
        ConsultarCitaDiaIntentHandler,
        ConsultarCitasMesIntentHandler,
        ConsultarCitasFechasIntentHandler,
        ObtenerSiguienteRegistroIntentHandler,
        EliminarRegistroIntentHandler,
        ConfirmarEliminacionIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .addRequestInterceptors(
        LocalizationRequestInterceptor,
        LoggingRequestInterceptor,
        LoadAttributesRequestInterceptor)
    .addResponseInterceptors(
        LoggingResponseInterceptor,
        SaveAttributesResponseInterceptor)
    .withPersistenceAdapter(persistenceAdapter)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();