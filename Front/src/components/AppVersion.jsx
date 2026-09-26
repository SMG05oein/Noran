import { APP_VERSION } from '../config/version';

const AppVersion = ({ prefix = '앱 버전: ' }) => {
  return (
    <span>
      {prefix}
      {APP_VERSION}
    </span>
  );
};

export default AppVersion;
