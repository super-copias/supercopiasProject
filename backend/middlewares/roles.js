module.exports = function(requiredRoles = []){
  return function(req, res, next){
    const user = req.user;
    if(!user) return res.status(401).json({ message: 'No autorizado' });
    if(requiredRoles.length === 0) return next();
    const has = requiredRoles.includes(user.role);
    if(!has) return res.status(403).json({ message: 'Permiso denegado' });
    next();
  }
}
