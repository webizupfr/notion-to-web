import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

/**
 * Certificat de complétion — PDF paysage A4.
 *
 * Design moderne, premium, LinkedIn-ready :
 *   - Bandeau jaune full-width en haut (logo + n° cert)
 *   - Nom de l'apprenant en focal point géant
 *   - Programme + sous-titre
 *   - Compétences validées (extraites de programMeta.learningOutcomes Notion)
 *   - Footer avec signature + URL vérification publique + code
 *
 * Le PDF est généré à la volée mais le code est stable (table `certificate`).
 */

type Props = {
  recipientName: string;
  programTitle: string;
  programSubtitle?: string | null;
  /** Liste de compétences validées (extraite de Notion learningOutcomes). 3-5 items idéal. */
  learningOutcomes?: string[] | null;
  completedAt: Date;
  /** Nom de la personne qui signe */
  issuerName: string;
  /** Titre du signataire (ex: "Fondateur d'Impulsion") */
  issuerTitle?: string | null;
  brandName: string;
  /** Code public stable (ex: "IMP-A1B2C3-D4E5") */
  verificationCode: string;
  /** URL complète sans protocole (ex: "impulsion.studio/cert/verify/IMP-...") */
  verificationUrl: string;
};

// ─── Palette ────────────────────────────────────────────────────────────────
const YELLOW = '#F9D656';
const YELLOW_INK = '#1A1408'; // texte sur fond jaune
const INK = '#0F1724';
const MUTED = '#6B7280';
const SUBTLE = '#94A3B8';
const LINE = '#E2E4E8';
const PAPER = '#FDFCF9';

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    backgroundColor: PAPER,
    fontFamily: 'Helvetica',
    color: INK,
  },

  // ── Bandeau jaune top (full width) ──
  topBand: {
    backgroundColor: YELLOW,
    paddingHorizontal: 48,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: YELLOW_INK,
    marginRight: 10,
  },
  brand: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: YELLOW_INK,
  },
  certNumber: {
    fontSize: 11,
    fontFamily: 'Courier-Bold',
    color: YELLOW_INK,
    letterSpacing: 1.5,
  },

  // ── Body wrapper ──
  body: {
    flex: 1,
    paddingHorizontal: 56,
    paddingTop: 36,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },

  // ── Hero (eyebrow + title + nom) ──
  hero: {
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 4,
    color: SUBTLE,
    marginBottom: 16,
  },
  bravo: {
    fontSize: 40,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -1,
    color: INK,
    marginBottom: 4,
  },
  bravoUnderline: {
    width: 56,
    height: 3,
    backgroundColor: YELLOW,
    marginBottom: 22,
  },
  certifyLine: {
    fontSize: 11,
    color: MUTED,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  recipient: {
    fontSize: 44,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -1.5,
    color: INK,
    marginBottom: 8,
    textAlign: 'center',
  },
  recipientUnderline: {
    width: 100,
    height: 1,
    backgroundColor: LINE,
    marginBottom: 18,
  },

  // ── Programme ──
  programLine: {
    fontSize: 11,
    color: MUTED,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  programTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  programSubtitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Oblique',
    color: MUTED,
    marginTop: 8,
    maxWidth: 460,
    textAlign: 'center',
  },

  // ── Compétences validées ──
  outcomesBlock: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: LINE,
    alignItems: 'center',
    width: '100%',
  },
  outcomesLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: SUBTLE,
    marginBottom: 12,
  },
  outcomesList: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  outcomeCheck: {
    fontSize: 11,
    color: YELLOW_INK,
    fontFamily: 'Helvetica-Bold',
    marginRight: 8,
  },
  outcomeText: {
    fontSize: 11,
    color: INK,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  footerLeft: {
    alignItems: 'flex-start',
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  footerLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: SUBTLE,
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 16,
    fontFamily: 'Helvetica-BoldOblique',
    color: INK,
    marginBottom: 2,
  },
  signatureTitle: {
    fontSize: 10,
    color: MUTED,
  },
  verifyUrl: {
    fontSize: 9,
    color: SUBTLE,
    marginBottom: 4,
  },
  verifyCode: {
    fontSize: 12,
    fontFamily: 'Courier-Bold',
    color: INK,
    letterSpacing: 1.5,
  },
  issuedDate: {
    fontSize: 9,
    color: SUBTLE,
    marginTop: 6,
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

/**
 * Parse `learningOutcomes` (string Notion) en liste d'items courts.
 * Format Notion typique : "- item1\n- item2\n- item3" ou "item1\nitem2\nitem3".
 * On normalise et limite à 4 items max pour ne pas casser le layout.
 */
function parseOutcomes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^[\s•·▸▪◦‣⁃\-*]+/, '')
        .replace(/^[0-9]+[.)]\s*/, '')
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 4);
}

export function CertificateDocument({
  recipientName,
  programTitle,
  programSubtitle,
  learningOutcomes,
  completedAt,
  issuerName,
  issuerTitle,
  brandName,
  verificationCode,
  verificationUrl,
}: Props) {
  const dateStr = formatFrDate(completedAt);
  const outcomes = Array.isArray(learningOutcomes)
    ? learningOutcomes.slice(0, 4)
    : parseOutcomes(learningOutcomes);

  return (
    <Document
      title={`Certificat · ${recipientName} · ${programTitle}`}
      author={brandName}
      creator={brandName}
      subject={`Certificat de complétion — ${programTitle}`}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* ── Bandeau jaune top ── */}
        <View style={styles.topBand}>
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={styles.brand}>{brandName}</Text>
          </View>
          <Text style={styles.certNumber}>{verificationCode}</Text>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Certificat de complétion</Text>
            <Text style={styles.bravo}>Bravo !</Text>
            <View style={styles.bravoUnderline} />

            <Text style={styles.certifyLine}>Ce certificat atteste que</Text>
            <Text style={styles.recipient}>{recipientName}</Text>
            <View style={styles.recipientUnderline} />

            <Text style={styles.programLine}>a complété avec succès le programme</Text>
            <Text style={styles.programTitle}>{programTitle}</Text>
            {programSubtitle ? (
              <Text style={styles.programSubtitle}>{programSubtitle}</Text>
            ) : null}

            {/* Compétences validées */}
            {outcomes.length > 0 ? (
              <View style={styles.outcomesBlock}>
                <Text style={styles.outcomesLabel}>Compétences validées</Text>
                <View style={styles.outcomesList}>
                  {outcomes.map((item, idx) => (
                    <View key={idx} style={styles.outcomeRow}>
                      <Text style={styles.outcomeCheck}>✓</Text>
                      <Text style={styles.outcomeText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerLabel}>Signature</Text>
              <Text style={styles.signatureName}>{issuerName}</Text>
              {issuerTitle ? (
                <Text style={styles.signatureTitle}>{issuerTitle}</Text>
              ) : null}
              <Text style={styles.issuedDate}>Délivré le {dateStr}</Text>
            </View>

            <View style={styles.footerRight}>
              <Text style={styles.footerLabel}>Vérification</Text>
              <Text style={styles.verifyUrl}>{verificationUrl}</Text>
              <Text style={styles.verifyCode}>{verificationCode}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
