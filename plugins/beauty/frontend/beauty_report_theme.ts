export type Theme = {
  name: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  typography: {
    heading: string;
    body: string;
    accent: string;
  };
};

export const modern: Theme = {
  name: 'modern',
  palette: {
    primary: '#6B21A8',
    secondary: '#06B6D4',
    accent: '#F97316',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#0F172A',
  },
  typography: {
    heading: '600',
    body: '400',
    accent: '500',
  },
};

export const luxury: Theme = {
  name: 'luxury',
  palette: {
    primary: '#0F172A',
    secondary: '#B794F4',
    accent: '#FDE68A',
    background: '#FAF8F6',
    surface: '#FFFFFF',
    text: '#111827',
  },
  typography: {
    heading: '700',
    body: '400',
    accent: '600',
  },
};

export const korean: Theme = {
  name: 'korean',
  palette: {
    primary: '#FB7185',
    secondary: '#FDE68A',
    accent: '#60A5FA',
    background: '#FFF7ED',
    surface: '#FFFFFF',
    text: '#111827',
  },
  typography: {
    heading: '600',
    body: '400',
    accent: '500',
  },
};

export const minimal: Theme = {
  name: 'minimal',
  palette: {
    primary: '#111827',
    secondary: '#6B7280',
    accent: '#10B981',
    background: '#FFFFFF',
    surface: '#F3F4F6',
    text: '#0F172A',
  },
  typography: {
    heading: '600',
    body: '300',
    accent: '500',
  },
};

export default {
  modern,
  luxury,
  korean,
  minimal,
};