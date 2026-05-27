import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  makeDefaultStorageLocations,
  defaultCategories,
  type FakSection,
  type GearItem,
  type StorageLocation
} from "@pack-attack/shared";

type Screen = "sections" | "fak" | "fak-section";

const sectionSwatchByCategory: Record<string, string> = {
  docs: "#d8b18f",
  bike: "#c9896b",
  camp: "#a59557",
  kitchen: "#9caec3",
  layers: "#e0a05d",
  fak: "#d87d3f"
};

const fakSections: FakSection[] = [
  { id: "trauma", name: "Trauma", itemIds: ["tourniquet", "compression"] },
  { id: "wound", name: "Wound Care", itemIds: ["gauze", "tape"] },
  { id: "meds", name: "Meds", itemIds: ["ibuprofen", "antihistamine"] }
];

const fakItems: GearItem[] = [
  { id: "tourniquet", name: "CAT Tourniquet", categoryId: "fak", locationId: "right-pannier", quantity: 1, status: "packed" },
  { id: "compression", name: "Israeli Bandage", categoryId: "fak", locationId: "right-pannier", quantity: 1, status: "staged" },
  { id: "gauze", name: "Sterile Gauze", categoryId: "fak", locationId: "tank-bag", quantity: 8, status: "packed" },
  { id: "tape", name: "Medical Tape", categoryId: "fak", locationId: "tail-bag", quantity: 1, status: "missing" },
  { id: "ibuprofen", name: "Ibuprofen", categoryId: "fak", locationId: "tank-bag", quantity: 12, status: "packed" },
  { id: "antihistamine", name: "Cetirizine", categoryId: "fak", locationId: "tank-bag", quantity: 8, status: "packed" }
];

function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>("sections");
  const [activeFakSectionId, setActiveFakSectionId] = useState<string>("trauma");
  const [statusText, setStatusText] = useState("Ready");
  const [locations, setLocations] = useState<StorageLocation[]>(() => makeDefaultStorageLocations("mobile-default-vehicle"));
  const [newLocationName, setNewLocationName] = useState("");

  const activeFakSection = useMemo(
    () => fakSections.find((section) => section.id === activeFakSectionId) ?? fakSections[0],
    [activeFakSectionId]
  );

  const activeFakItems = useMemo(
    () => fakItems.filter((item) => activeFakSection.itemIds.includes(item.id)),
    [activeFakSection]
  );

  function swatchForCategory(categoryId: string): string {
    return sectionSwatchByCategory[categoryId] ?? "#bfa88c";
  }

  function handleAddLocation(): void {
    const normalized = newLocationName.trim();
    if (!normalized) {
      return;
    }

    const id = normalized
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!id || locations.some((location) => location.id === id)) {
      setStatusText("Location already exists or invalid");
      return;
    }

    setLocations((prev) => [...prev, { id, name: normalized, kind: "bag", vehicleId: "mobile-default-vehicle" }]);
    setNewLocationName("");
    setStatusText(`Added location: ${normalized}`);
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>Pack Attack</Text>
        <Text style={styles.subtitle}>ADV + Overland Packing</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.syncCard}>
          <Text style={styles.syncTitle}>Storage Locations</Text>
          <Text style={styles.syncState}>{statusText}</Text>
          {locations.map((location) => (
            <Text key={location.id} style={styles.locationText}>{location.name} ({location.kind})</Text>
          ))}
          <TextInput
            style={styles.input}
            placeholder="Add location (example: Fender Bag)"
            placeholderTextColor="#95a996"
            value={newLocationName}
            onChangeText={setNewLocationName}
          />
          <Pressable style={styles.syncButton} onPress={handleAddLocation}>
            <Text style={styles.syncButtonText}>Add Location</Text>
          </Pressable>
        </View>

        {screen === "sections" && (
          <>
            <Text style={styles.screenTitle}>Sections</Text>
            {defaultCategories.map((category) => (
              <Pressable key={category.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.sectionSwatch, { backgroundColor: swatchForCategory(category.id) }]} />
                  <Text style={styles.cardTitle}>{category.name}</Text>
                </View>
              </Pressable>
            ))}

            <Pressable style={[styles.card, styles.fakCard]} onPress={() => setScreen("fak")}>
              <View style={styles.cardRow}>
                <View style={[styles.sectionSwatch, styles.fakSwatch]} />
                <Text style={styles.cardTitle}>First Aid Kit</Text>
              </View>
              <Text style={styles.cardMeta}>Tap to open FAK internals</Text>
            </Pressable>
          </>
        )}

        {screen === "fak" && (
          <>
            <Pressable onPress={() => setScreen("sections")}>
              <Text style={styles.back}>Back to Sections</Text>
            </Pressable>
            <Text style={styles.screenTitle}>FAK Sections</Text>

            {fakSections.map((section) => (
              <Pressable
                key={section.id}
                style={styles.card}
                onPress={() => {
                  setActiveFakSectionId(section.id);
                  setScreen("fak-section");
                }}
              >
                <Text style={styles.cardTitle}>{section.name}</Text>
                <Text style={styles.cardMeta}>{section.itemIds.length} items</Text>
              </Pressable>
            ))}
          </>
        )}

        {screen === "fak-section" && (
          <>
            <Pressable onPress={() => setScreen("fak")}>
              <Text style={styles.back}>Back to FAK</Text>
            </Pressable>

            <Text style={styles.screenTitle}>{activeFakSection.name}</Text>
            {activeFakItems.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>Qty {item.quantity} | {item.status}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#e8e1d8"
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#a78f84"
  },
  brand: {
    color: "#4a1f2f",
    fontSize: 24,
    fontWeight: "700"
  },
  subtitle: {
    color: "#7a5b4f",
    marginTop: 2
  },
  content: {
    padding: 16,
    gap: 12
  },
  syncCard: {
    backgroundColor: "#fff7ee",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#8d5f66"
  },
  syncTitle: {
    color: "#4a1f2f",
    fontSize: 16,
    fontWeight: "700"
  },
  syncState: {
    color: "#7a5b4f",
    marginTop: 4,
    marginBottom: 10
  },
  locationText: {
    color: "#7a5b4f",
    marginBottom: 4
  },
  input: {
    borderWidth: 1,
    borderColor: "#b2928d",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    color: "#4a1f2f",
    marginBottom: 8,
    backgroundColor: "#fffcf8"
  },
  syncButton: {
    backgroundColor: "#f4e3d6",
    borderColor: "#8d5f66",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center"
  },
  syncButtonText: {
    color: "#4a1f2f",
    fontWeight: "600"
  },
  screenTitle: {
    color: "#4a1f2f",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 6
  },
  card: {
    backgroundColor: "#fff7ee",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#8d5f66"
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  sectionSwatch: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(74,31,47,0.2)"
  },
  fakSwatch: {
    backgroundColor: "#d87d3f"
  },
  fakCard: {
    borderColor: "#bc6d38"
  },
  cardTitle: {
    color: "#4a1f2f",
    fontSize: 16,
    fontWeight: "600"
  },
  cardMeta: {
    color: "#7a5b4f",
    marginTop: 4
  },
  back: {
    color: "#8b4f2c",
    marginBottom: 8
  }
});

export default App;
