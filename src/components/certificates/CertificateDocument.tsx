import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

/**
 * Certificat de complétion — PDF paysage A4.
 *
 * Design sobre, éditorial. Couleurs du brand (jaune signature).
 * Le fichier est généré à la volée côté serveur à chaque téléchargement.
 */

type Props = {
  recipientName: string;
  programTitle: string;
  programSubtitle?: string | null;
  completedAt: Date;
  issuerName: string;
  brandName: string;
  verificationId?: string;
};

const YELLOW = '#F5D54C'; // approximation du --accent du site
const INK = '#0F1724';
const MUTED = '#6B7280';
const LINE = '#E2E4E8';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FDFCF9',
    padding: 48,
    fontFamily: 'Helvetica',
    color: INK,
  },
  frame: {
    flex: 1,
    borderWidth: 1,
    borderColor: LINE,
    padding: 40,
    justifyContent: 'space-between',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: MUTED,
    fontFamily: 'Helvetica-Bold',
  },
  topMeta: {
    fontSize: 9,
    color: MUTED,
    fontFamily: 'Helvetica',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  eyebrow: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: MUTED,
    marginBottom: 14,
  },
  title: {
    fontSize: 44,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -1,
    marginBottom: 8,
    textAlign: 'center',
  },
  titleAccent: {
    width: 64,
    height: 4,
    backgroundColor: YELLOW,
    marginTop: 4,
    marginBottom: 20,
  },
  certifyLine: {
    fontSize: 11,
    color: MUTED,
    marginBottom: 8,
    textAlign: 'center',
  },
  recipient: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 18,
    textAlign: 'center',
  },
  programLine: {
    fontSize: 11,
    color: MUTED,
    marginBottom: 6,
    textAlign: 'center',
  },
  programTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    textAlign: 'center',
  },
  programSubtitle: {
    fontSize: 12,
    color: MUTED,
    marginTop: 8,
    maxWidth: 420,
    textAlign: 'center',
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sigBlock: {
    alignItems: 'flex-start',
  },
  sigLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: MUTED,
    marginBottom: 4,
  },
  sigLine: {
    borderTopWidth: 1,
    borderColor: INK,
    paddingTop: 4,
    minWidth: 160,
  },
  sigName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: INK,
  },
  verifyBlock: {
    alignItems: 'flex-end',
  },
  verifyLabel: {
    fontSize: 9,
    color: MUTED,
  },
  verifyId: {
    fontSize: 10,
    fontFamily: 'Courier',
    color: INK,
    marginTop: 2,
  },
});

function formatFrDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
}

export function CertificateDocument({
  recipientName,
  programTitle,
  programSubtitle,
  completedAt,
  issuerName,
  brandName,
  verificationId,
}: Props) {
  const dateStr = formatFrDate(completedAt);

  return (
    <Document
      title={`Certificat · ${recipientName} · ${programTitle}`}
      author={brandName}
      creator={brandName}
      subject={`Certificat de complétion — ${programTitle}`}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.frame}>
          {/* Top row : brand + date */}
          <View style={styles.top}>
            <Text style={styles.brand}>{brandName}</Text>
            <Text style={styles.topMeta}>Délivré le {dateStr}</Text>
          </View>

          {/* Center : certificate content */}
          <View style={styles.center}>
            <Text style={styles.eyebrow}>Certificat de complétion</Text>
            <Text style={styles.title}>Bravo !</Text>
            <View style={styles.titleAccent} />

            <Text style={styles.certifyLine}>Ce certificat atteste que</Text>
            <Text style={styles.recipient}>{recipientName}</Text>

            <Text style={styles.programLine}>a complété avec succès le programme</Text>
            <Text style={styles.programTitle}>{programTitle}</Text>

            {programSubtitle ? (
              <Text style={styles.programSubtitle}>{programSubtitle}</Text>
            ) : null}
          </View>

          {/* Bottom row : signature + verification */}
          <View style={styles.bottom}>
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>Signature</Text>
              <View style={styles.sigLine}>
                <Text style={styles.sigName}>{issuerName}</Text>
              </View>
            </View>

            {verificationId ? (
              <View style={styles.verifyBlock}>
                <Text style={styles.verifyLabel}>ID de vérification</Text>
                <Text style={styles.verifyId}>{verificationId}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
