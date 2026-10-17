import React, { useEffect, useState } from 'react';
import { Animated, Easing, Image, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { BrandImages } from '../../constants/images';

interface WhatsAppCoachButtonProps {
  width: number;
  height: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * "Chat with Coach on WhatsApp". Fades and rises in once, so it does not pop in when a coach's profile finishes
 * loading, and gives a short press animation instead of a flat opacity flash.
 */
export default function WhatsAppCoachButton({
  width,
  height,
  onPress,
  style,
}: WhatsAppCoachButtonProps) {
  const [appear] = useState(() => new Animated.Value(0));
  const [press] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [appear]);

  const animatePress = (to: number) =>
    Animated.spring(press, {
      toValue: to,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: appear,
          transform: [
            { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
            { scale: press },
          ],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => animatePress(0.97)}
        onPressOut={() => animatePress(1)}
        accessibilityRole="button"
        accessibilityLabel="Chat with Coach on WhatsApp"
      >
        <Image
          source={BrandImages.whatsappCoachButton}
          style={{ width, height }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </Pressable>
    </Animated.View>
  );
}
