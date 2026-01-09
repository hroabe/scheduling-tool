/**
 * Cute Theme Configuration - RFC-0008
 * 
 * Pastel colors, rounded corners, friendly fonts
 */

import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

export const cuteTheme = extendTheme({
  config,
  fonts: {
    heading: '"M PLUS Rounded 1c", "Noto Sans JP", sans-serif',
    body: '"M PLUS Rounded 1c", "Noto Sans JP", sans-serif',
  },
  colors: {
    brand: {
      50: '#FFF0F5',   // lavender blush
      100: '#FFE4EC',
      200: '#FFBCD0',
      300: '#FF94B4',
      400: '#FF6B98',
      500: '#FF69B4',  // hot pink (primary)
      600: '#E85A9F',
      700: '#D14B8A',
      800: '#BA3C75',
      900: '#8B2D58',
    },
    // Additional cute palette
    cute: {
      pink: '#FFB6C1',
      lavender: '#E6E6FA',
      mint: '#98FB98',
      peach: '#FFDAB9',
      sky: '#87CEEB',
      cream: '#FFFDD0',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'linear-gradient(135deg, #FFF0F5 0%, #E6E6FA 50%, #FFE4EC 100%)',
        color: 'gray.700',
        minHeight: '100vh',
      },
    },
  },
  radii: {
    none: '0',
    sm: '8px',
    base: '12px',
    md: '16px',
    lg: '20px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '40px',
    full: '9999px',
  },
  shadows: {
    sm: '0 2px 8px rgba(255, 105, 180, 0.15)',
    md: '0 4px 16px rgba(255, 105, 180, 0.2)',
    lg: '0 8px 24px rgba(255, 105, 180, 0.25)',
    xl: '0 12px 32px rgba(255, 105, 180, 0.3)',
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
      baseStyle: {
        borderRadius: 'full',
        fontWeight: 'bold',
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.400',
            transform: 'translateY(-2px) scale(1.02)',
            boxShadow: 'lg',
          },
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        ghost: {
          _hover: {
            bg: 'brand.50',
            transform: 'scale(1.05)',
          },
        },
        outline: {
          borderColor: 'brand.300',
          borderWidth: '2px',
          _hover: {
            bg: 'brand.50',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '2xl',
          boxShadow: 'md',
          border: '2px solid',
          borderColor: 'brand.100',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'brand.400',
      },
      baseStyle: {
        field: {
          borderRadius: 'xl',
        },
      },
    },
    Heading: {
      baseStyle: {
        color: 'brand.600',
      },
    },
    Text: {
      baseStyle: {
        color: 'gray.600',
      },
    },
  },
});

export default cuteTheme;
