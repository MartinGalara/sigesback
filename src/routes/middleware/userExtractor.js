const jwt = require('jsonwebtoken')

module.exports = (req , res , next) => {

    const authorization = req.get('authorization')

    let token = null;

    if(authorization && authorization.toLowerCase().startsWith('bearer')){
        token = authorization.substring(7);
    }

    const decodedToken = jwt.verify(token, process.env.SECRET)
    
    if(!token || !decodedToken.id){
        return res.status(401).json({ error: 'Token invalido o faltante'})
    }

    const { id } = decodedToken;
    const {role} = decodedToken
    const {active} = decodedToken
    const {userId} = decodedToken
    const {email} = decodedToken

    req.body.id = id;
    req.body.role = role
    req.body.active = active
    req.body.userId = userId
    req.body.email = email
    req.body.token = token

    next()

}