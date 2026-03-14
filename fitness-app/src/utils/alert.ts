import { Alert, Platform } from 'react-native';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

declare const window: {
  alert: (message: string) => void;
  confirm: (message: string) => boolean;
};

/**
 * Cross-platform alert that works on both web and native.
 * On web, Alert.alert is not supported, so we use window.confirm/window.alert.
 */
export const crossAlert = (
  title: string,
  message: string,
  buttons?: AlertButton[]
): void => {
  if (Platform.OS === 'web') {
    if (!buttons || buttons.length === 0) {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const actionBtn = buttons.find((b) => b.style !== 'cancel');

    if (buttons.length === 1) {
      window.alert(`${title}\n\n${message}`);
      buttons[0].onPress?.();
      return;
    }

    // Confirmation dialog with cancel + action
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) {
      actionBtn?.onPress?.();
    } else {
      cancelBtn?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};
