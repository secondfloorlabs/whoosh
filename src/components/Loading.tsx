import { Spinner } from 'react-bootstrap';

type LoadingProps = {
  text?: string;
};

const Loading = ({ text }: LoadingProps) => {
  return (
    <>
      <span>{text}</span>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
        }}
      >
        <Spinner animation={'border'} />
      </div>
    </>
  );
};

export default Loading;
