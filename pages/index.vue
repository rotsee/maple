<template>
  <v-card>
    <div class="text-center">
      <v-progress-circular
        v-if="loading"
        :width="100"
        color="red"
        indeterminate
      />
    </div>
    <v-card-title>
      Today's map. Can you guess when it's from?
    </v-card-title>
    <v-card-text>
    <client-only v-if="paths.length">
        <svg
          preserveAspectRatio="xMidYMin meet"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:thenmap="http://www.thenmap.net/2017/data"
          version="1.1"
          :width="mapWidth"
          :height="mapHeight"
          :viewBox="`0 0 ${mapWidth} ${mapHeight}`"
        >
          <path
            v-for="path, idx in paths"
            :key="`path-${idx}`"
            :d="path.d"
            :data-name="path.name"
            :data-capital="path.capital"
            :data-flag="path.flag"
            @mouseover="showTooltip"
            @mouseout="snackbar = false"
          />
        </svg>
      </client-only>
      Källa, viktig info om kartan
    </v-card-text>

    <v-card-actions
      v-if="attemptsLeft > 0"
      class="d-flex justify-space-between"
    >
      <v-form
        ref="dateForm"
        v-model="valid"
      >
        <v-row>
          <v-text-field
            v-model.number="userGuessYear"
            type="number"
            label="Year"
            :min="minDate.slice(0, 4)"
            :max="maxDate.slice(0, 4)"
            :rules="yearRules"
            class="mr-6 ml-3"
          />
          <v-text-field
            v-model.number="userGuessMonth"
            type="number"
            label="Month"
            min="1"
            max="12"
            :rules="monthRules"
            class="mr-6"
          />
          <v-text-field
            v-model.number="userGuessDate"
            type="number"
            label="Date"
            min="1"
            max="31"
            :rules="dateRules"
            class="mr-6"
          />
          <v-btn
            large
            variant="outlined"
            @click="submit"
            :disabled="!valid"
            height="4em"
          >
            Submit
          </v-btn>
        </v-row>
      </v-form>
    </v-card-actions>
    <v-alert type="warning" title="No more attempts" v-else>
      <p>
        Sorry, you ran out of attempts. Please try again tomorrow!
      </p>
      <p>
        The borders, capitals and flags you see are valid from {{ validFrom }} to {{ validTo }}.
      </p>
    </v-alert>
  </v-card>
  <v-dialog
    v-model="showResult"
    max-width="900"
  >
    <v-card>
      <v-card-text v-if="userIsCorrect">
        Congratulations, this map is indeed correct in {{ userGuess }}! 
        The borders, capitals and flags you see are valid from {{ validFrom }} to {{ validTo }}.
      </v-card-text>
      <v-card-text v-else>
        Sorry, this map is {{ userGuess > mapDate ? "earlier" : "later" }} than {{ userGuess }}.
        You have {{ attemptsLeft }} attempts left to guess!
      </v-card-text>

      <v-card-actions>
        <v-btn color="primary" block @click="showResult = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-snackbar
    v-model="snackbar"
    timeout="-1"
  >
    <v-img
      v-if="countryInfo.flag"
      :src="countryInfo.flag"
      class="float-right"
      width="150px"
    />
    <div class="text-subtitle-1 pb-2">{{ countryInfo.name }}</div>
    <p v-if="countryInfo.capital">
      <strong>Capital:</strong> {{ countryInfo.capital }}
    </p>

  </v-snackbar>
</template>

<script>
import { DOMParser } from '@xmldom/xmldom'


const MIN_DATE = "1950-01-01"
const MAX_DATE = "2020-12-31"
const MAP_WIDTH = 1200
const MAP_HEIGHT = 600
const ATTEMPTS = 5

export default {
  data: () => ({
    loading: true,
    snackbar: false,
    showResult: false,
    attemptsLeft: ATTEMPTS,
    pathRefs: [],
    countryInfo: {
      name: null,
      flag: null,
      capital: null,
    },
    userGuessYear: 1950,
    userGuessMonth: 1,
    userGuessDate: 1,
    userIsCorrect: false,
    minDate: MIN_DATE,
    maxDate: MAX_DATE,
    mapWidth: MAP_WIDTH,
    mapHeight: MAP_HEIGHT,
    valid: false,
    yearRules: [
      v => v >= MIN_DATE.slice(0, 4) || "Date must be after 1950",
      v => v <= MAX_DATE.slice(0, 4) || "Date must be before 2021",
    ],
    monthRules: [
      v => v >= 1 && v <= 12 || "Enter a month between 1 and 12",
    ],
    dateRules: [
      v => v >= 1 && v <= 31 || "Enter a date between 1 and 31",
    ],
  }),
  setup: async function () {
    const from = new Date(MIN_DATE).valueOf() // typ -631238400000
    const to = new Date(MAX_DATE).valueOf() // typ 1577750400000
    const diff = to - from
    const rand = Math.floor(Math.random() * (diff + 1))
    const mapDate = new Date(rand + from).toISOString()
    const mapWidth = MAP_WIDTH
    const mapHeight = MAP_HEIGHT
    const props = ["name", "capital", "currency", "flag", "sdate", "edate"]
    const url = `https://api.thenmap.net/v2/world-2/svg/${mapDate}?svg_width=${mapWidth}&svg_height=${mapHeight}&svg_props=${props.join("|")}`

    const parseSVG = function (source) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(source, "image/svg+xml")
      let paths = doc.getElementsByTagName("path")
      paths = Array.from(paths)
        .map(p => ({
          d: p.getAttribute("d"),
          name: p.getAttribute("thenmap:name"),
          capital: p.getAttribute("thenmap:capital"),
          flag: p.getAttribute("thenmap:flag"),
          sdate: p.getAttribute("thenmap:sdate"),
          edate: p.getAttribute("thenmap:edate"),
        }))
      /*
        Array.from(doc.getElementsByTagName("path"))
          .map(p => ["d", "thenmap:name"].reduce((o, x) => (o[x] = p.getAttribute(x), o), {}))
      */
      return paths
    }
    const response = await fetch(url)
    const svg = await response.text()
    let paths = []
    try {
      paths = parseSVG(svg)
    } catch(e) {
      console.log("Error parsing SVG", e)
    }
    return { paths, mapDate }
  },
  mounted: function () {
    this.$refs.dateForm.validate()
    this.loading = false
  },
  computed: {
    userGuess: function() {
      return `${this.userGuessYear}-${String(this.userGuessMonth).padStart(2, "0")}-${String(this.userGuessDate).padStart(2, "0")}`
    },
    validFrom: function() {
      const sdates = this.paths
        .map(p => p.sdate)
        .filter(p => p)
      return sdates.reduce((max, d) => d > max ? d : max, "0")
    },
    validTo: function() {
      const edates = this.paths
        .map(p => p.edate)
        .filter(p => p)
      return edates.reduce((min, d) => d < min ? d : min, "9")
    },
  },
  methods: {
    submit: async function() {
      if (this.valid) {
        // const { valid } = await this.$refs.dateForm.validate()
        this.userIsCorrect = (this.userGuess >= this.validFrom && this.userGuess <= this.validTo)
        this.attemptsLeft--
        this.showResult = true
      }
    },
    randomDate: function() {
      const from = new Date(this.minDate).valueOf() // typ -631238400000
      const to = new Date(this.maxDate).valueOf() // typ 1577750400000
      const diff = to - from
      const rand = Math.floor(Math.random() * (diff + 1))
      return new Date(rand + from).toISOString()
    },
    setPathRef: function(elm) {
      if (elm) {
        this.pathRefs.push(elm)
      }
    },
    showTooltip: function(evt) {
      const elm = evt.target
      this.countryInfo.name = elm.getAttribute("data-name")
      this.countryInfo.capital = elm.getAttribute("data-capital")
      this.countryInfo.flag = elm.getAttribute("data-flag")
      this.snackbar = true
    },
  },
}
</script>
<style>
path {
  fill: #efefef;
  stroke: #222222;
  stroke-width: 0.5px;
}
path:hover {
  fill: aquamarine;
}
</style>