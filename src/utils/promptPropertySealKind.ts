import {Alert} from 'react-native';

export type PropertySealKind = 'seal' | 'deseal';

/** Ask the officer to pick Property Seal or Property Deseal. */
export function promptPropertySealKind(): Promise<PropertySealKind | null> {
  return new Promise(resolve => {
    Alert.alert(
      'Property Seal & Deseal',
      'Choose Property Seal or Property Deseal to open the matching form.',
      [
        {text: 'Cancel', style: 'cancel', onPress: () => resolve(null)},
        {text: 'Property Deseal', onPress: () => resolve('deseal')},
        {text: 'Property Seal', onPress: () => resolve('seal')},
      ],
      {cancelable: true, onDismiss: () => resolve(null)},
    );
  });
}
