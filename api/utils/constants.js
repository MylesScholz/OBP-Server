// Occurrence field names (local constants for consistency)
const ERROR_FLAGS = 'errorFlags'
const DATE_LABEL_PRINT = 'dateLabelPrint'
const FIELD_NO = 'fieldNumber'
const CATALOG_NO = 'catalogNumber'
const OCCURRENCE_ID = 'occurrenceID'
const INATURALIST_ID = 'userId'
const INATURALIST_ALIAS = 'userLogin'
const FIRST_NAME = 'firstName'
const FIRST_NAME_INITIAL = 'firstNameInitial'
const LAST_NAME = 'lastName'
const RECORDED_BY = 'recordedBy'
const SAMPLE_ID = 'sampleId'
const SPECIMEN_ID = 'specimenId'
const DAY = 'day'
const MONTH = 'month'
const YEAR = 'year'
const DAY2 = 'day2'
const MONTH2 = 'month2'
const YEAR2 = 'year2'
const START_DAY_OF_YEAR = 'startDayofYear'
const END_DAY_OF_YEAR = 'endDayofYear'
const VERBATIM_DATE = 'verbatimEventDate'
const COUNTRY = 'country'
const STATE_PROVINCE = 'stateProvince'
const COUNTY = 'county'
const LOCALITY = 'locality'
const ELEVATION = 'verbatimElevation'
const LATITUDE = 'decimalLatitude'
const LONGITUDE = 'decimalLongitude'
const ACCURACY = 'coordinateUncertaintyInMeters'
const SAMPLING_PROTOCOL = 'samplingProtocol'
const RESOURCE_RELATIONSHIP = 'relationshipOfResource'
const RESOURCE_ID = 'resourceID'
const RELATED_RESOURCE_ID = 'relatedResourceID'
const RELATIONSHIP_REMARKS = 'relationshipRemarks'
const PLANT_PHYLUM = 'phylumPlant'
const PLANT_ORDER = 'orderPlant'
const PLANT_FAMILY = 'familyPlant'
const PLANT_GENUS = 'genusPlant'
const PLANT_SPECIES = 'speciesPlant'
const PLANT_TAXON_RANK = 'taxonRankPlant'
const INATURALIST_URL = 'url'
const BEE_PHYLUM = 'phylum'
const BEE_CLASS = 'class'
const BEE_ORDER = 'order'
const BEE_FAMILY = 'family'
const BEE_GENUS = 'genus'
const BEE_SUBGENUS = 'subgenus'
const SPECIFIC_EPITHET = 'specificEpithet'
const TAXONOMIC_NOTES = 'taxonomicNotes'
const SCIENTIFIC_NAME = 'scientificName'
const SEX = 'sex'
const CASTE = 'caste'
const BEE_TAXON_RANK = 'taxonRank'
const IDENTIFIED_BY = 'identifiedBy'
const VOL_DET_FAMILY = 'familyVolDet'
const VOL_DET_GENUS = 'genusVolDet'
const VOL_DET_SPECIES = 'speciesVolDet'
const VOL_DET_SEX = 'sexVolDet'
const VOL_DET_CASTE = 'casteVolDet'

const constants = {
    // Maximum number of output files stored on the server for each output type
    fileLimits: {
        maxUploads: 25,
        maxOccurrences: 25,
        maxPulls: 25,
        maxFlags: 25,
        maxDuplicates: 25,
        maxLabels: 25,
        maxAddresses: 25,
        maxEmails: 25,
        maxPivots: 25
    },
    auth: {
        saltLength: 10
    },
    occurrences: {
        // Occurrence field names
        fieldNames: {
            errorFlags: ERROR_FLAGS,
            dateLabelPrint: DATE_LABEL_PRINT,
            fieldNumber: FIELD_NO,
            catalogNumber: CATALOG_NO,
            occurrenceId: OCCURRENCE_ID,
            iNaturalistId: INATURALIST_ID,
            iNaturalistAlias: INATURALIST_ALIAS,
            firstName: FIRST_NAME,
            firstNameInitial: FIRST_NAME_INITIAL,
            lastName: LAST_NAME,
            recordedBy: RECORDED_BY,
            sampleId: SAMPLE_ID,
            specimenId: SPECIMEN_ID,
            day: DAY,
            month: MONTH,
            year: YEAR,
            day2: DAY2,
            month2: MONTH2,
            year2: YEAR2,
            startDayOfYear: START_DAY_OF_YEAR,
            endDayOfYear: END_DAY_OF_YEAR,
            verbatimDate: VERBATIM_DATE,
            country: COUNTRY,
            stateProvince: STATE_PROVINCE,
            county: COUNTY,
            locality: LOCALITY,
            elevation: ELEVATION,
            latitude: LATITUDE,
            longitude: LONGITUDE,
            accuracy: ACCURACY,
            samplingProtocol: SAMPLING_PROTOCOL,
            resourceRelationship: RESOURCE_RELATIONSHIP,
            resourceId: RESOURCE_ID,
            relatedResourceId: RELATED_RESOURCE_ID,
            relationshipRemarks: RELATIONSHIP_REMARKS,
            plantPhylum: PLANT_PHYLUM,
            plantOrder: PLANT_ORDER,
            plantFamily: PLANT_FAMILY,
            plantGenus: PLANT_GENUS,
            plantSpecies: PLANT_SPECIES,
            plantTaxonRank: PLANT_TAXON_RANK,
            iNaturalistUrl: INATURALIST_URL,
            beePhylum: BEE_PHYLUM,
            beeClass: BEE_CLASS,
            beeOrder: BEE_ORDER,
            beeFamily: BEE_FAMILY,
            beeGenus: BEE_GENUS,
            beeSubgenus: BEE_SUBGENUS,
            specificEpithet: SPECIFIC_EPITHET,
            taxonomicNotes: TAXONOMIC_NOTES,
            scientificName: SCIENTIFIC_NAME,
            sex: SEX,
            caste: CASTE,
            beeTaxonRank: BEE_TAXON_RANK,
            identifiedBy: IDENTIFIED_BY,
            volDetFamily: VOL_DET_FAMILY,
            volDetGenus: VOL_DET_GENUS,
            volDetSpecies: VOL_DET_SPECIES,
            volDetSex: VOL_DET_SEX,
            volDetCaste: VOL_DET_CASTE
        },
        // Template object for occurrences; static values are provided as strings, data-dependent values are set to null
        template: {
            [ERROR_FLAGS]: null,
            [DATE_LABEL_PRINT]: '',
            [FIELD_NO]: null,
            [CATALOG_NO]: '',
            [OCCURRENCE_ID]: null,
            [INATURALIST_ID]: null,
            [INATURALIST_ALIAS]: null,
            [FIRST_NAME]: null,
            [FIRST_NAME_INITIAL]: null,
            [LAST_NAME]: null,
            [RECORDED_BY]: null,
            [SAMPLE_ID]: null,
            [SPECIMEN_ID]: null,
            [DAY]: null,
            [MONTH]: null,
            [YEAR]: null,
            [VERBATIM_DATE]: null,
            [DAY2]: '',
            [MONTH2]: '',
            [YEAR2]: '',
            [START_DAY_OF_YEAR]: '',
            [END_DAY_OF_YEAR]: '',
            [COUNTRY]: null,
            [STATE_PROVINCE]: null,
            [COUNTY]: null,
            [LOCALITY]: null,
            [ELEVATION]: null,
            [LATITUDE]: null,
            [LONGITUDE]: null,
            [ACCURACY]: null,
            [SAMPLING_PROTOCOL]: null,
            [RESOURCE_RELATIONSHIP]: null,
            [RESOURCE_ID]: null,
            [RELATED_RESOURCE_ID]: null,
            [RELATIONSHIP_REMARKS]: '',
            [PLANT_PHYLUM]: null,
            [PLANT_ORDER]: null,
            [PLANT_FAMILY]: null,
            [PLANT_GENUS]: null,
            [PLANT_GENUS]: null,
            [PLANT_TAXON_RANK]: null,
            [INATURALIST_URL]: null,
            [BEE_PHYLUM]: '',
            [BEE_CLASS]: '',
            [BEE_ORDER]: '',
            [BEE_FAMILY]: '',
            [BEE_GENUS]: '',
            [BEE_SUBGENUS]: '',
            [SPECIFIC_EPITHET]: '',
            [TAXONOMIC_NOTES]: '',
            [SCIENTIFIC_NAME]: '',
            [SEX]: '',
            [CASTE]: '',
            [BEE_TAXON_RANK]: '',
            [IDENTIFIED_BY]: '',
            [VOL_DET_FAMILY]: '',
            [VOL_DET_GENUS]: '',
            [VOL_DET_SPECIES]: '',
            [VOL_DET_SEX]: '',
            [VOL_DET_CASTE]: ''
        },
        // A list of fields that should be flagged if empty
        nonEmptyFields: [
            FIRST_NAME,
            FIRST_NAME_INITIAL,
            LAST_NAME,
            SAMPLE_ID,
            SPECIMEN_ID,
            DAY,
            MONTH,
            YEAR,
            COUNTRY,
            STATE_PROVINCE,
            COUNTY,
            LOCALITY,
            LATITUDE,
            LONGITUDE,
            SAMPLING_PROTOCOL
        ],
        sortConfig: [
            { field: FIELD_NO, direction: 1, type: 'number' },
            { field: LAST_NAME, direction: 1, type: 'string' },
            { field: FIRST_NAME, direction: 1, type: 'string' },
            { field: MONTH, direction: 1, type: 'number' },
            { field: DAY, direction: 1, type: 'number' },
            { field: SAMPLE_ID, direction: 1, type: 'number' },
            { field: SPECIMEN_ID, direction: 1, type: 'number' }
        ]
    },
    observations: {
        ofvs: {
            sampleId: 'Sample ID.',
            beesCollected: 'Number of bees collected'
        }
    },
    labels: {
        // List of mandatory fields for a label to be printed
        requiredFields: [
            FIELD_NO,
            FIRST_NAME_INITIAL,
            LAST_NAME,
            SAMPLE_ID,
            DAY,
            MONTH,
            YEAR,
            COUNTRY,
            STATE_PROVINCE,
            LOCALITY,
            LATITUDE,
            LONGITUDE,
            SAMPLING_PROTOCOL
        ]
    },
    usernames: {
        // Username field names
        fieldNames: {
            userLogin: 'userLogin',
            fullName: 'fullName',
            firstName: 'firstName',
            firstNameInitial: 'firstNameInitial',
            lastName: 'lastName',
            email: 'email',
            address: 'address',
            city: 'city',
            stateProvince: 'stateProvince',
            zipPostal: 'zipPostal',
            country: 'country'
        }
    },
    determinations: {
        // Determination field names
        fieldNames: {
            fieldNumber: FIELD_NO,
            beePhylum: BEE_PHYLUM,
            beeClass: BEE_CLASS,
            beeOrder: BEE_ORDER,
            beeFamily: BEE_FAMILY,
            beeGenus: BEE_GENUS,
            beeSubgenus: BEE_SUBGENUS,
            specificEpithet: SPECIFIC_EPITHET,
            taxonomicNotes: TAXONOMIC_NOTES,
            scientificName: SCIENTIFIC_NAME,
            sex: SEX,
            caste: CASTE,
            beeTaxonRank: BEE_TAXON_RANK,
            identifiedBy: IDENTIFIED_BY,
            volDetFamily: VOL_DET_FAMILY,
            volDetGenus: VOL_DET_GENUS,
            volDetSpecies: VOL_DET_SPECIES,
            volDetSex: VOL_DET_SEX,
            volDetCaste: VOL_DET_CASTE
        },
        // Template object for determinations
        template: {
            [FIELD_NO]: '',
            [BEE_PHYLUM]: '',
            [BEE_CLASS]: '',
            [BEE_ORDER]: '',
            [BEE_FAMILY]: '',
            [BEE_GENUS]: '',
            [BEE_SUBGENUS]: '',
            [SPECIFIC_EPITHET]: '',
            [TAXONOMIC_NOTES]: '',
            [SCIENTIFIC_NAME]: '',
            [SEX]: '',
            [CASTE]: '',
            [BEE_TAXON_RANK]: '',
            [IDENTIFIED_BY]: '',
            [VOL_DET_FAMILY]: '',
            [VOL_DET_GENUS]: '',
            [VOL_DET_SPECIES]: '',
            [VOL_DET_SEX]: '',
            [VOL_DET_CASTE]: ''
        }
    },
    abbreviations: {
        countries: {
            'United States': 'USA',
            'Canada': 'CA',
            'CAN': 'CA'
        },
        stateProvinces: {
            'Alabama': 'AL',                    // United States
            'Alaska': 'AK',
            'Arizona': 'AZ',
            'Arkansas': 'AR',
            'California': 'CA',
            'Colorado': 'CO',
            'Connecticut': 'CT',
            'Delaware': 'DE',
            'Florida': 'FL',
            'Georgia': 'GA',
            'Hawaii': 'HI',
            'Idaho': 'ID',
            'Illinois': 'IL',
            'Indiana': 'IN',
            'Iowa': 'IA',
            'Kansas': 'KS',
            'Kentucky': 'KY',
            'Louisiana': 'LA',
            'Maine': 'ME',
            'Maryland': 'MD',
            'Massachusetts': 'MA',
            'Michigan': 'MI',
            'Minnesota': 'MN',
            'Mississippi': 'MS',
            'Missouri': 'MO',
            'Montana': 'MT',
            'Nebraska': 'NE',
            'Nevada': 'NV',
            'New Hampshire': 'NH',
            'New Jersey': 'NJ',
            'New Mexico': 'NM',
            'New York': 'NY',
            'North Carolina': 'NC',
            'North Dakota': 'ND',
            'Ohio': 'OH',
            'Oklahoma': 'OK',
            'Oregon': 'OR',
            'Pennsylvania': 'PA',
            'Rhode Island': 'RI',
            'South Carolina': 'SC',
            'South Dakota': 'SD',
            'Tennessee': 'TN',
            'Texas': 'TX',
            'Utah': 'UT',
            'Vermont': 'VT',
            'Virginia': 'VA',
            'Washington': 'WA',
            'West Virginia': 'WV',
            'Wisconsin': 'WI',
            'Alberta': 'AB',                    // Canadian Provinces
            'British Columbia': 'BC',
            'Manitoba': 'MB',
            'New Brunswick': 'NB',
            'Newfoundland and Labrador': 'NL',
            'Nova Scotia': 'NS',
            'Ontario': 'ON',
            'Prince Edward Island': 'PE',
            'Quebec': 'QC',
            'Saskatchewan': 'SK',
            'Northwest Territories': 'NT',      // Canadian Territories
            'Nunavut': 'NU',
            'Yukon': 'YT'
        },
        counties: {
            'Alberni-Clayoquot': 'ACRD',        // British Columbia Regional Districts
            'Bulkley-Nechako': 'RDBN',
            'Capital': 'CRD',
            'Cariboo': 'Cariboo',
            'Central Coast': 'CCRD',
            'Central Kootenay': 'RDCK',
            'Central Okanagan': 'RDCO',
            'Columbia-Shuswap': 'CSRD',
            'Comox-Strathcona': 'CxSRD',
            'Cowichan Valley': 'CwVRD',
            'East Kootenay': 'RDEK',
            'Fraser Valley': 'FVRD',
            'Fraser-Fort George': 'RDFS',
            'Greater Vancouver': 'MVRD',
            'Kitimat-Stikine': 'RDKS',
            'Kootenay Boundary': 'RDKB',
            'Mount Waddington': 'RDMW',
            'Nanaimo': 'RDN',
            'North Coast': 'RDNC',
            'North Okanagan': 'RDNO',
            'Northern Rockies': 'NRRM',
            'Okanagan-Similkameen': 'RDOS',
            'Peace River': 'Peace River',
            'Skeena-Queen Charlotte': 'NCRD',
            'Squamish-Lillooet': 'SLRD',
            'Stikine Region': 'Stikine',
            'Strathcona': 'SRD',
            'Sunshine Coast': 'SCRD',
            'Thompson-Nicola': 'TNRD',
            'Doña Ana': 'Dona Ana',
            'Lincoln , US, WA': 'Lincoln',      // Fix a Google API error
            'Franklin , US, WA': 'Franklin'
        }
    }
}

export const { fileLimits } = constants
export const { auth } = constants
export const { occurrences } = constants
export const { template, fieldNames, nonEmptyFields, sortConfig } = constants.occurrences
export const { ofvs } = constants.observations
export const { labels } = constants
export const { requiredFields } = constants.labels
export const { usernames } = constants
export const { determinations } = constants
export const { abbreviations } = constants

export default constants