# Loaded automatically by Python from the app working directory.
# It extends the existing Flask app without rewriting the stable V17 server core.
import flask
_original_init=flask.Flask.__init__

def _v18_init(self,*a,**kw):
    _original_init(self,*a,**kw)
    try:
        from v18_common import ensure_schema
        from v18_hr import register as reg_hr
        from v18_comms import register as reg_comms
        from v18_export import register as reg_export
        reg_hr(self);reg_comms(self);reg_export(self)
        @self.before_request
        def _ensure_v18_schema():
            if flask.request.path.startswith('/api/v18/'):
                ensure_schema()
    except Exception as e:
        print('V18 extension registration failed:',repr(e),flush=True)

flask.Flask.__init__=_v18_init
