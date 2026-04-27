import { Section, Text } from '@react-email/components';

/**
 * Header logo + nom — repris de l'AppHeader du site (point jaune + texte).
 */
export function Brand() {
  return (
    <Section className="text-left">
      <table cellPadding="0" cellSpacing="0" border={0}>
        <tr>
          <td style={{ verticalAlign: 'middle', paddingRight: '8px' }}>
            <div
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '9999px',
                backgroundColor: '#F9D656',
              }}
            />
          </td>
          <td style={{ verticalAlign: 'middle' }}>
            <Text
              className="m-0 text-[15px] font-semibold tracking-tight text-[#0F172A]"
              style={{ letterSpacing: '-0.01em' }}
            >
              Impulsion
            </Text>
          </td>
        </tr>
      </table>
    </Section>
  );
}
