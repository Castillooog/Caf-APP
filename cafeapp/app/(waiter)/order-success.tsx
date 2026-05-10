import React, { useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { CheckCircle, Home, Clock, MapPin } from 'lucide-react-native'
import { Colors, Font, Radius, Shadow } from '@/constants/theme'

export default function OrderSuccessScreen() {
  const insets = useSafeAreaInsets()
  const scaleAnim = React.useRef(new Animated.Value(0)).current
  const opacityAnim = React.useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const handleGoHome = () => {
    // Navega de vuelta al menú principal (o la ruta que corresponda)
    router.replace('/(tabs)' as any)
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40 }]}>
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {/* Icono de éxito */}
        <View style={styles.iconContainer}>
          <CheckCircle size={80} color={Colors.sage} />
        </View>

        {/* Título */}
        <Text style={styles.title}>¡Pedido confirmado!</Text>
        
        {/* Subtítulo */}
        <Text style={styles.subtitle}>
          Tu orden ha sido recibida y está siendo preparada
        </Text>

        {/* ✅ BOTÓN: VOLVER AL MENÚ (Agregado aquí) */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleGoHome}
          activeOpacity={0.8}
        >
          <Text style={styles.menuButtonText}>Volver al menú</Text>
        </TouchableOpacity>

        {/* Detalles del pedido */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Clock size={20} color={Colors.mocha} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>TIEMPO ESTIMADO</Text>
              <Text style={styles.detailValue}>10 - 15 minutos</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <MapPin size={20} color={Colors.mocha} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>ESTADO</Text>
              <Text style={styles.detailValue}>En preparación</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconPlaceholder} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>NÚMERO DE ORDEN</Text>
              <Text style={styles.detailValue}>#{Math.floor(1000 + Math.random() * 9000)}</Text>
            </View>
          </View>
        </View>

        {/* Mensaje adicional */}
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>
            Recibirás una notificación cuando tu pedido esté listo para recoger.
          </Text>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    gap: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.sageDust,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.sage,
    ...Shadow.card,
  },
  title: {
    fontFamily: Font.serif,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.espresso,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Font.sans,
    fontSize: 15,
    color: Colors.mocha,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: -8,
  },
  // Estilos del nuevo botón
  menuButton: {
    backgroundColor: Colors.espresso,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 8,   // Espacio respecto al subtítulo
    marginBottom: 24, // Espacio respecto a la tarjeta de detalles
    ...Shadow.sm,
  },
  menuButtonText: {
    fontFamily: Font.sans,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  detailsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.creamDeep,
    ...Shadow.card,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: Font.sans,
    fontSize: 11,
    color: Colors.mocha,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontFamily: Font.serif,
    fontSize: 18,
    color: Colors.espresso,
    fontWeight: '700',
  },
  detailIconPlaceholder: {
    width: 20,
    height: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.creamDeep,
    marginHorizontal: -20,
  },
  messageBox: {
    backgroundColor: Colors.terraDust,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.terra,
    width: '100%',
  },
  messageText: {
    fontFamily: Font.sans,
    fontSize: 13,
    color: Colors.terra,
    textAlign: 'center',
    lineHeight: 18,
  },
})