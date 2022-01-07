import { Modal } from 'react-bootstrap';
import { logIn, Providers } from 'src/services/firebase';
import { Mixpanel } from 'src/utils/mixpanel';

type LoginProps = {
  onClose: () => void;
  showModal: boolean;
};

const Login = (props: LoginProps) => {
  const { onClose, showModal } = props;

  return (
    <>
      <Modal show={showModal} onHide={onClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Sign in</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="google-btn" onClick={() => {
            Mixpanel.track("Signing in with Google")
            logIn(Providers.google)
          }}>
            <div className="google-icon-wrapper">
              <img
                className="google-icon-svg"
                src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
                alt=""
              />
            </div>
            <p className="btn-text">
              <b>Sign in with Google</b>
            </p>
          </div>
          <div className="google-btn" onClick={() => {
            Mixpanel.track("Signing in with Twitter")
            logIn(Providers.twitter)
          }}>
            <div className="google-icon-wrapper">
              <img
                className="google-icon-svg"
                src="https://upload.wikimedia.org/wikipedia/sco/9/9f/Twitter_bird_logo_2012.svg"
                alt=""
              />
            </div>
            <p className="btn-text">
              <b>Sign in with Twitter</b>
            </p>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default Login;
