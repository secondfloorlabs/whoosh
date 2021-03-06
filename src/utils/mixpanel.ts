import mixpanel from 'mixpanel-browser';
import { isProduction } from 'src/utils/helpers';
mixpanel.init('17a9c18890a5cf5af8a5e5ffe3763ce8');

let env_check = isProduction();

let actions = {
  identify: (id?: string) => {
    if (env_check) mixpanel.identify(id);
  },
  alias: (id: string) => {
    if (env_check) mixpanel.alias(id);
  },
  track: (name: string, props?: {}) => {
    if (env_check) mixpanel.track(name, props);
  },
  people: {
    set: (props: {}) => {
      if (env_check) mixpanel.people.set(props);
    },
  },
};

export let Mixpanel = actions;
