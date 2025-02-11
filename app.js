import express from 'express';
import session from 'express-session';
import {v4 as uuidv4} from 'uuid';
import os from 'os';
import macaddress from 'macaddress';
import moment from 'moment-timezone';

const app = express();
const PORT = 3001;

app.listen(PORT,()=>{
    console.log(`Servidor iniciado en http://localhost:${PORT}`)
})

app.use(express.json())
app.use(express.urlencoded({extended:true}));


app.use(
    session({
        secret:"sacalaschelas-SesionesHTTP-VariablesDeSesion",
        resave:false,
        saveUninitialized:false,
        cookie:{maxAge: 5 * 60 * 1000}
    })
)
const sessions={};
app.get('/',(req,res)=>{
    return res.status(200).json({
        message:"Bienvenid@ al API de Control de Sesiones",
                                author:"Carlos Isaac Fosado."})
})

//Función de utilidad que nos permitirá acceder a la información de red
const getServerIp = () =>{
    const interfaces = os.networkInterfaces();
    for(const name in interfaces){
        for(const iface of interfaces[name]){
            if(iface.family === 'IPv4' && !iface.internal){
                return iface.address;
            }
        }
    }
}
const getServerMac = () =>{
    const interfaces = os.networkInterfaces();
    for(const name in interfaces){
        for(const iface of interfaces[name]){
            if(iface.family === 'IPv4' && !iface.internal){
                return iface.mac;
            }
        }
    }
}

app.post('/login',(req,res)=>{
    const{email,nickname,macAddress}=req.body;
    if(!email || !nickname || !macAddress){
        return res.status(400).json({message:"Se esperan campos requeridos"})
    }

    const sessionId=uuidv4();
    const now=new Date();
    

    sessions[sessionId]={
        sessionId,
        email,
        nickname,
        macAddress,
        ip:getServerIp(),
        createAt:now,
        lastAccess:now,
        servermac: getServerMac()
    };

    res.status(200).json({
        message: "Se ha logeado de manera exitosa",
        sessionId,
    });
});

app.post("/logout",(req,res)=>{
    const {email, nickname} =req.body;
    const sessionId = req.query.sessionId
    if(!sessionId || !sessions[sessionId]){
        return res.status(404).json({
            message: "No se ha encontrado una sesion activa"
        });
    }
    //if (email) req.session.email = email;
    //if (nickname) req.session.nickname = nickname;
    
    delete sessions[sessionId];
    req.session.destroy((err)=>{
        if(err){
            return res.status(500).json({
                message:'Error al cerrar sesión'});
        }
    });
    res.status(200).json({
        message:"Logout successful"});
});

app.post('/update', (req, res) => {
    const { sessionId, email, nickname } = req.body;

    if (!sessionId || !sessions[sessionId]) {
        return res.status(404).json({
            message: 'No existe una sesión activa',
        });
    }

    // Actualizar los campos en la sesión
    if (email) sessions[sessionId].email = email;
    if (nickname) sessions[sessionId].nickname = nickname;

    // Actualizar el tiempo de último acceso
    sessions[sessionId].lastAccess = moment()
        .tz('America/Mexico_City')
        .format('YYYY/MM/DD HH:mm:ss');

    // Responder con éxito
    res.status(200).json({
        message: 'Sesión actualizada correctamente',
        session: sessions[sessionId],
    });
});
app.get("/status",(req,res)=>{
    const sessionId =req.query.sessionId;
    if(!sessionId || !sessions[sessionId]){
        return res.status(404).json({
            message:"No existe una sesion activa"
        });
    }
    
    const session = sessions[sessionId]
    
    const now = new Date();
   const idleTime = (now - new Date(session.lastAccess)) / 1000;
    const duration = (now - new Date(session.createdAt)) / 1000; 

    res.status(200).json({
        message: 'Sesión activa',
        session,
        idleTime: `${idleTime} segundos`,
        duration: `${duration} segundos`
    });
});

app.get('/session-activas', (req, res) => {
    if (Object.keys(sessions).length === 0) {
        return res.status(404).json({
            message: 'No se encontraron sesiones activas'
        });
    }
    res.status(200).json({
        message: 'Sesiones activas',
        currentSessions: sessions
    }); 
});

setInterval(() => {
    const now = new Date();
    for (const sessionID in sessions) {
        const session = sessions[sessionID];
        const idleTime = (now - new Date(session.lastAccessed)) / 1000; 
        if (idleTime > 120) { // 2 minutos
            delete sessions[sessionID];
        }
    }
}, 60000);