import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { DpaContext } from "./dpa-data";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
  },
  paragraph: {
    marginBottom: 8,
  },
  listItem: {
    marginBottom: 3,
    paddingLeft: 12,
  },
  table: {
    marginTop: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 4,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#333",
    paddingBottom: 4,
    marginBottom: 2,
  },
  tableCell: {
    flex: 1,
    paddingRight: 8,
  },
  tableCellBold: {
    flex: 1,
    paddingRight: 8,
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#666",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  },
  unverified: {
    color: "#b45309",
  },
});

interface DpaPdfDocumentProps {
  context: DpaContext;
}

export function DpaPdfDocument({ context }: DpaPdfDocumentProps) {
  const dateStr = context.generatedAt.toLocaleDateString("nl-NL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Verwerkersovereenkomst</Text>
        <Text style={styles.paragraph}>
          Overeenkomst inzake de verwerking van persoonsgegevens conform de
          Algemene Verordening Gegevensbescherming (AVG/GDPR).
        </Text>

        <Text style={styles.subtitle}>1. Partijen</Text>
        <Text style={styles.paragraph}>
          Verwerkingsverantwoordelijke: {context.organizationName}
        </Text>
        <Text style={styles.paragraph}>
          Verwerker: Inovico B.V. ({context.contactEmail})
        </Text>

        <Text style={styles.subtitle}>2. Doel van de verwerking</Text>
        <Text style={styles.paragraph}>
          Het verwerken van audio-opnames van vergaderingen ten behoeve van
          transcriptie, samenvatting, en extractie van actiepunten met behulp
          van kunstmatige intelligentie.
        </Text>

        <Text style={styles.subtitle}>3. Gegevenslocatie</Text>
        <Text style={styles.paragraph}>
          Primaire gegevensopslag: {context.dataResidency}
        </Text>
        <Text style={styles.paragraph}>
          Bewaartermijn: {context.retentionPeriod}
        </Text>

        <Text style={styles.subtitle}>4. Sub-verwerkers</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellBold}>Naam</Text>
            <Text style={styles.tableCellBold}>Doel</Text>
            <Text style={styles.tableCellBold}>Locatie</Text>
          </View>
          {context.subProcessors.map((sp) => (
            <View key={sp.name} style={styles.tableRow}>
              <Text style={styles.tableCell}>{sp.name}</Text>
              <Text style={styles.tableCell}>{sp.purpose}</Text>
              <Text style={sp.verified ? styles.tableCell : styles.unverified}>
                {sp.dataLocation}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.subtitle}>5. Beveiligingsmaatregelen</Text>
        {context.securityMeasures.map((measure) => (
          <Text key={measure} style={styles.listItem}>
            • {measure}
          </Text>
        ))}

        <Text style={styles.subtitle}>6. Rechten van betrokkenen</Text>
        <Text style={styles.paragraph}>
          De verwerker ondersteunt de verwerkingsverantwoordelijke bij het
          voldoen aan verzoeken van betrokkenen op grond van hoofdstuk III van
          de AVG, waaronder het recht op inzage, rectificatie, wissing,
          beperking van de verwerking, en gegevensoverdraagbaarheid.
        </Text>

        <Text style={styles.subtitle}>7. Melding van datalekken</Text>
        <Text style={styles.paragraph}>
          De verwerker stelt de verwerkingsverantwoordelijke zonder onredelijke
          vertraging op de hoogte van een datalek dat betrekking heeft op
          persoonsgegevens, en in ieder geval binnen 48 uur na ontdekking.
        </Text>

        <View style={styles.footer}>
          <Text>
            Gegenereerd op {dateStr} | Versie: {dateStr} |{" "}
            {context.organizationName}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
