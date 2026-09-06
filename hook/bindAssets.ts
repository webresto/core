import serveStatic from 'serve-static';
import * as path from "path";

export default function() {
    sails.hooks.http.app.use('/restocore/assets', serveStatic(path.join(__dirname, '../assets')));
};
