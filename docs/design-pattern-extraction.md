# Design Pattern Extraction

How will Spidergram tackle discovering/auditing design systems? We treat a given "Design Pattern" (or component, or whatever it's called) as a distinct type of trackable domain entity. When we find instances of it on a page we create an OccursOn edge linking the DesignPattern to the Resource; the OccursOn instances also includes any specific properties we extracted from the instance of the pattern we found in the Resource's markup.

Convenience functions exist on both DesignPattern and Resource to create a new OccursOn instance.

## Class Diagram:

```mermaid
classDiagram
  class DesignPattern {
    <<Node>>
    -type:~symbol~ 'design_pattern'
    +name~string~
    +description~string~
    +documentation~URL~
    +occursOn(Resource, properties)~OccursOn~
  }

  class OccursOn {
    <<Edge>>
    +source~DesignPattern~
    +predicate:~symbol~ 'occurs_on'
    +target~Resource~
    +[propertyName~string~]~string~
    +new(DesignPattern, Resource, properties)~OccursOn~
  }
  
  class Resource {
    <<Mixin>>
    +includesPattern(DesignPattern, properties)~OccursOn~
  }

  OccursOn --|> DesignPattern
  OccursOn --|> Resource
```

These Typescript Types are also be defined by the Patterns system: 

```
PatternInstances = {
  pattern:DesignPattern;
  instances:OccursOn[];
}

PatternExtractor = Extractor<Resource, PatternInstances[]>

// Alternately:
PatternExtractor = (r:Resource) => PatternInstances[];
```

A PatternExtractor is a function that, given a Resource and potentially some configuration options, is expected to parse the Resource for instances of one or more design patterns, create an OccursOn object describing each instance of the pattern that was found, and return them all keyed by pattern. Most PatternExtractors will probably find just one pattern, but makes support for multi-pattern extractors explicit. The application or script that called the PatternExtractor is responsible for persisting the returned data; the PatternExtractor's job is just to parse it out of the Resource.

This approach makes it possible to use "mega-extractors" that are responsible for many different kinds of patterns, or smaller pattern-specific ones that might be reused or repurposed.

By convention, the extra properties added to the OccursOn relationship should contain text, URLs, numerical data, and other properties that are explicitly part of the design pattern itself. For example, a CTA pattern might have a 'CTA Title', a 'Subhead,' a 'style', and a destination URL. Capturing those four pieces of information and adding them to the OccursOn object each time the pattern is encountered makes it possible to compare pattern occurrences in later analysis steps.
