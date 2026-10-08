import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import { mockMedicineCatalog } from '../services/mockData';
import medicineService from '../services/medicineService';

export default function MedicineBrandFinderScreen({ navigation }) {
  const [catalog, setCatalog] = useState(mockMedicineCatalog);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedId, setSelectedMedId] = useState(
    mockMedicineCatalog[0]?.id || 'med-1'
  );
  const [searchResults, setSearchResults] = useState(null);
  const [dynamicAlternatives, setDynamicAlternatives] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch suggested molecules from Medicine Alternative Finder API on mount
  useEffect(() => {
    let isMounted = true;
    const fetchMolecules = async () => {
      try {
        setIsLoading(true);
        const data = await medicineService.getMolecules();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setCatalog(data);
          if (!selectedMedId || !data.some((m) => m.id === selectedMedId)) {
            setSelectedMedId(data[0].id);
          }
        }
      } catch (err) {
        console.warn('[MedicineBrandFinder] Error loading molecules:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchMolecules();
    return () => {
      isMounted = false;
    };
  }, []);

  const trimmedQuery = searchQuery.trim().toLowerCase();

  // Helper to normalize strings for flexible partial matching
  const cleanStr = (str) =>
    (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

  // Debounced server search to query Medicine Alternative Finder dynamically
  useEffect(() => {
    let isMounted = true;
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const serverResults = await medicineService.searchMedicines(trimmed);
        if (isMounted && Array.isArray(serverResults)) {
          setSearchResults(serverResults);
          if (
            serverResults.length > 0 &&
            !serverResults.some((m) => m.id === selectedMedId)
          ) {
            setSelectedMedId(serverResults[0].id);
          }
        }
      } catch (err) {
        console.warn('[MedicineBrandFinder] Server search error:', err);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Synchronous client filter for instant 0ms typing feedback
  const localFiltered = useMemo(() => {
    if (!trimmedQuery) return catalog;

    const cleanedQuery = cleanStr(trimmedQuery);
    const queryTokens = cleanedQuery.split(/\s+/).filter(Boolean);

    return catalog.filter((med) => {
      const activeLower = (med.activeIngredient || '').toLowerCase();
      const cleanedActive = cleanStr(med.activeIngredient);
      const categoryLower = (med.category || '').toLowerCase();
      const indicationLower = (med.indication || '').toLowerCase();
      const descLower = (med.description || '').toLowerCase();

      // 1. Direct partial match on active ingredient (e.g. "adapalene", "clinda", "niacinamide")
      if (
        activeLower.includes(trimmedQuery) ||
        cleanedActive.includes(cleanedQuery)
      ) {
        return true;
      }

      // 2. Direct match on medical category or indication
      if (
        categoryLower.includes(trimmedQuery) ||
        indicationLower.includes(trimmedQuery) ||
        descLower.includes(trimmedQuery)
      ) {
        return true;
      }

      // 3. Match on any brand name, formulation, or manufacturer
      if (
        med.brands &&
        med.brands.some((b) => {
          const brandLower = (b.name || '').toLowerCase();
          const cleanedBrand = cleanStr(b.name);
          const formLower = (b.form || '').toLowerCase();
          const mfgLower = (b.manufacturer || '').toLowerCase();
          return (
            brandLower.includes(trimmedQuery) ||
            cleanedBrand.includes(cleanedQuery) ||
            formLower.includes(trimmedQuery) ||
            mfgLower.includes(trimmedQuery)
          );
        })
      ) {
        return true;
      }

      // 4. Multi-token match (e.g. "niacin zinc", "clindamycin gel", "adapalene 0.1")
      if (queryTokens.length > 1) {
        const matchesAll = queryTokens.every((token) => {
          return (
            cleanedActive.includes(token) ||
            categoryLower.includes(token) ||
            indicationLower.includes(token) ||
            (med.brands &&
              med.brands.some(
                (b) =>
                  cleanStr(b.name).includes(token) ||
                  (b.manufacturer || '').toLowerCase().includes(token)
              ))
          );
        });
        if (matchesAll) return true;
      }

      return false;
    });
  }, [trimmedQuery, catalog]);

  // Combined results (using server results if returned, local filter immediately)
  const filteredMeds = useMemo(() => {
    if (!trimmedQuery) return catalog;
    if (searchResults !== null) return searchResults;
    return localFiltered;
  }, [trimmedQuery, catalog, searchResults, localFiltered]);

  // Derive the active medicine to display
  const selectedMed = useMemo(() => {
    if (filteredMeds.length === 0) return null;
    const found = filteredMeds.find((m) => m.id === selectedMedId);
    return found || filteredMeds[0];
  }, [filteredMeds, selectedMedId]);

  // Dynamically load exact composition alternatives when selectedMed changes
  useEffect(() => {
    let isMounted = true;
    if (!selectedMed?.id) {
      setDynamicAlternatives(null);
      return;
    }

    const loadAlternatives = async () => {
      try {
        const altData = await medicineService.getAlternatives(selectedMed.id);
        if (isMounted && altData?.alternatives && altData.alternatives.length > 0) {
          setDynamicAlternatives(altData.alternatives);
        } else if (isMounted) {
          setDynamicAlternatives(null);
        }
      } catch (err) {
        if (isMounted) setDynamicAlternatives(null);
      }
    };
    loadAlternatives();
    return () => {
      isMounted = false;
    };
  }, [selectedMed?.id]);

  // Derive available brands list (dynamic alternatives or catalog brands)
  const displayBrands = useMemo(() => {
    if (dynamicAlternatives && dynamicAlternatives.length > 0) {
      return dynamicAlternatives;
    }
    return selectedMed?.brands || [];
  }, [dynamicAlternatives, selectedMed]);

  // Check if a brand row matches the search query to highlight it
  const isBrandMatch = (brand) => {
    if (!trimmedQuery) return false;
    const bName = (brand.name || '').toLowerCase();
    const bForm = (brand.form || '').toLowerCase();
    const bMfg = (brand.manufacturer || '').toLowerCase();
    return (
      bName.includes(trimmedQuery) ||
      bForm.includes(trimmedQuery) ||
      bMfg.includes(trimmedQuery)
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header navigation={navigation} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Header */}
        <View style={styles.titleCard}>
          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 24 }}>💊</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.pageTitle}>Medicine Brand Finder</Text>
            <Text style={styles.pageSubtitle}>
              Match active ingredients & compare alternative brand pricing.
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
            }}
            placeholder="Search active ingredient (e.g. Adapalene, Clindamycin)..."
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearIconBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.clearIconText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search feedback when typing */}
        {trimmedQuery ? (
          <View style={styles.searchFeedbackRow}>
            <Text style={styles.searchFeedbackText}>
              {filteredMeds.length === 0
                ? `No matches for "${searchQuery.trim()}"`
                : filteredMeds.length === 1
                ? `1 medicine matching "${searchQuery.trim()}"`
                : `${filteredMeds.length} medicines matching "${searchQuery.trim()}"`}
            </Text>
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchLink}>Clear search</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Quick Molecule Pills / Matching Medicines */}
        {filteredMeds.length > 0 && (
          <View style={styles.pillsContainer}>
            <Text style={styles.sectionHeaderLabel}>
              {trimmedQuery ? 'Matching Molecules:' : 'Suggested Molecules:'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.moleculesRow}
            >
              {filteredMeds.map((med) => {
                const isSelected = selectedMed?.id === med.id;
                return (
                  <TouchableOpacity
                    key={med.id}
                    style={[
                      styles.moleculeChip,
                      isSelected && styles.moleculeChipSelected,
                    ]}
                    onPress={() => setSelectedMedId(med.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.moleculeChipText,
                        isSelected && styles.moleculeChipTextSelected,
                      ]}
                    >
                      {med.activeIngredient}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Empty State when no results found */}
        {filteredMeds.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Text style={{ fontSize: 32 }}>🔍</Text>
            </View>
            <Text style={styles.emptyTitle}>
              No medicines found matching "{searchQuery}"
            </Text>
            <Text style={styles.emptySubtitle}>
              Try searching by generic active ingredient (e.g. Adapalene,
              Clindamycin, Ketoconazole), medical indication (e.g. Acne,
              Eczema), or popular brand name (e.g. Differin, Nizral).
            </Text>
            <TouchableOpacity
              style={styles.resetSearchBtn}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.8}
            >
              <Text style={styles.resetSearchBtnText}>Reset to All Medicines</Text>
            </TouchableOpacity>

            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsLabel}>Popular Searches:</Text>
              <View style={styles.suggestionChipsWrap}>
                {['Adapalene', 'Clindamycin', 'Ketoconazole', 'Hydrocortisone', 'Niacinamide'].map(
                  (item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.suggestionChip}
                      onPress={() => setSearchQuery(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.suggestionChipText}>{item}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          </View>
        )}

        {/* Selected Molecule Details */}
        {selectedMed && (
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.activeIngredientName}>
                  {selectedMed.activeIngredient}
                </Text>
                <Text style={styles.categoryBadge}>{selectedMed.category}</Text>
              </View>
              <View
                style={[
                  styles.rxBadge,
                  {
                    backgroundColor: selectedMed.prescriptionRequired
                      ? Colors.accentPurpleLight
                      : Colors.accentGreenLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rxBadgeText,
                    {
                      color: selectedMed.prescriptionRequired
                        ? Colors.accentPurple
                        : Colors.accentGreen,
                    },
                  ]}
                >
                  {selectedMed.prescriptionRequired
                    ? '℞ Prescription Required'
                    : 'OTC Available'}
                </Text>
              </View>
            </View>

            <Text style={styles.indicationText}>
              <Text style={{ fontWeight: '700' }}>Clinical Indications:</Text>{' '}
              {selectedMed.indication}
            </Text>
            <Text style={styles.descriptionText}>{selectedMed.description}</Text>

            {/* Alternative Brands List */}
            <View style={styles.brandsSectionHeaderRow}>
              <Text style={styles.brandsSectionTitle}>
                Available Brands & Formulations in Pharmacy
              </Text>
              <Text style={styles.brandsCountBadge}>
                {displayBrands.length} Brands
              </Text>
            </View>

            {displayBrands.map((brand, idx) => {
              const matched = isBrandMatch(brand);
              return (
                <View
                  key={brand.id || idx}
                  style={[
                    styles.brandRowCard,
                    matched && styles.brandRowCardMatched,
                  ]}
                >
                  <View style={styles.brandInfoCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.brandName}>{brand.name}</Text>
                      {matched && (
                        <View style={styles.matchBadge}>
                          <Text style={styles.matchBadgeText}>✓ Match</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.brandDetails}>
                      Form: {brand.form} • Pack: {brand.size}
                      {brand.manufacturer && !brand.name.toLowerCase().includes(brand.manufacturer.toLowerCase())
                        ? ` • ${brand.manufacturer}`
                        : ''}
                    </Text>
                  </View>
                  <View style={styles.priceCol}>
                    <Text style={styles.priceAmount}>₹{brand.price}</Text>
                    <Text style={styles.priceMuted}>MRP (incl. taxes)</Text>
                  </View>
                </View>
              );
            })}

            {/* Informational Guidance */}
            <View style={styles.infoAlert}>
              <Text style={styles.infoAlertText}>
                ⚠️ Note: This tool is strictly informational to help patients
                understand drug composition and generic brand alternatives. Do
                not switch brands without doctor confirmation.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  titleCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.accentOrangeLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  pageSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textDark,
  },
  clearIconBtn: {
    padding: 4,
    marginLeft: 6,
  },
  clearIconText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  searchFeedbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  searchFeedbackText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  clearSearchLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  pillsContainer: {
    marginBottom: 12,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Colors.textMuted,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  moleculesRow: {
    gap: 8,
    paddingBottom: 4,
  },
  moleculeChip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  moleculeChipSelected: {
    backgroundColor: Colors.accentOrangeLight,
    borderColor: Colors.accentOrange,
  },
  moleculeChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  moleculeChipTextSelected: {
    color: Colors.accentOrange,
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    marginBottom: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  activeIngredientName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  categoryBadge: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  rxBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rxBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  indicationText: {
    fontSize: 13,
    color: Colors.textDark,
    lineHeight: 18,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  brandsSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 14,
    marginBottom: 10,
  },
  brandsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  brandsCountBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  brandRowCard: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  brandRowCardMatched: {
    borderColor: Colors.success,
    backgroundColor: Colors.successLight,
  },
  brandInfoCol: {
    flex: 1,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  matchBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  matchBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  brandDetails: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  priceCol: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  priceAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  priceMuted: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  infoAlert: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  infoAlertText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 380,
  },
  resetSearchBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 20,
  },
  resetSearchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  suggestionsContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 14,
    alignItems: 'center',
  },
  suggestionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  suggestionChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
});
