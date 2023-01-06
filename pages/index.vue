<template>
  <client-only>
    <h1>{{mapDate}}</h1>
  </client-only>
  <v-card>
    <div class="text-center">
      <v-progress-circular
        v-if="loading"
        :width="100"
        color="red"
        indeterminate
      />
    </div>
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

    <v-card-actions class="d-flex justify-space-between">
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
        <!--
        <v-text-field
          label="From what date is this map?"
          type="date"
          placeholder="yyyy-mm-dd"
          @keydown.enter="submit"
          :min="minDate"
          :max="maxDate"
          :rules="dateRules"
          v-model="userGuess"
          pattern="\d{4}-\d{2}-\d{2}"
          required
        />
        -->
      </v-form>
    </v-card-actions>
  </v-card>
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

export default {
  data: () => ({
    loading: true,
    snackbar: false,
    pathRefs: [],
    countryInfo: {
      name: null,
      flag: null,
      capital: null,
    },
    userGuessYear: null,
    userGuessMonth: null,
    userGuessDate: null,
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
    const url = `http://api.thenmap.net/v2/world-2/svg/${mapDate}?svg_width=${mapWidth}&svg_height=${mapHeight}&svg_props=${props.join("|")}`

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
    this.loading = false
  },
  methods: {
    submit: async function() {
      if (this.valid) {
        // const { valid } = await this.$refs.dateForm.validate()
        const sdates = this.paths.map(p => p.sdate)
        const validFrom = sdates.reduce((max, d) => d > max ? d : max, "0")
        const edates = this.paths.map(p => p.edate)
        const validTo = edates.reduce((min, d) => d > min ? d : min, "9")
        const userGuess = `${this.userGuessYear}-${this.userGuessMonth}-${this.userGuessDate}`
        const correct = (userGuess >= validFrom && userGuess <= validTo)
        console.log(validFrom, validTo, userGuess)
        alert(`Du har submittat ${userGuess}. Det var ${ correct ? "RÄTT!!!": "fel... :((((((("}`)
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