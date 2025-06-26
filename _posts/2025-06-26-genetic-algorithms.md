---
title: "Genetic Algorithms"
date: 2025-06-26
---

A while back, a friend of mine, Kevin Caravaggio, started posting on his blog about a project aimed at benchmarking various approaches to solving the [Traveling Salesman Problem](https://en.wikipedia.org/wiki/Travelling_salesman_problem). So far the project had featured Test-Driven-Development with Maven and a near-neighbor greedy algorithm. His first blog post on the subject is linked here: [](https://seedshare.io/blog/tsp1/). Looking to add some variety to the approaches for solving this problem, he asked me to write a genetic routing algorithm.  

We won't get too deep into the project structure, test-driven development, or the greedy algorithm for TSP since that is already well documented on Kevin's blog. However I thought it would be fun to go over my contribution to the project with a focus on the algorithm and benchmarking. So a great place to start is the problem statement Kevin started with:

>Worldwide e-commerce retailer, Congo.com, has begun trials of its UAV delivery service, which uses drones to ship smaller products to customers in the area surrounding a distribution center. As an engineer at Congo, your task is to develop a drone routing program. Your program should accept the location of the distribution center and a list of the customer locations as inputs and return a list of customers in the order they should be visited.

This percectly fits the bill for the classic TSP problem: given a fully connected weighted graph, find the shortest route that visits each node exactly once and forms a single cycle. Nearest-neighbor takes a simple and obvious approach, start with the closest node, then next closest, and on and on until all nodes are visited. Genetic routing algorithms are part of a larger family of algorithms which are particularly useful for solving some interesting NP-Hard problems. 

## Genetic Algorithms

So what exactly is a genetic algorithm? Simply put a genetic algorithm will generate a set of solutions for the problem at hand, then use the "best" solutions to generate new ones. This process will repeat until some threshold is met or a certain number of generations have been worked through. To do this we must define a set of valid(though not necessarilly optimal) solutions, a fitness function, thresholds for survivorship, and of course a limit on the number of generations. What does that look like for our problem? Well we can lay it out quickly below:

- Valid solutions: Any path that visits each node exactly once and contains exactly one cycle
- Fitness function: Distance of path according to edge weights
- Threshholds for survivorship: We'll start by allowing the 10% most fit paths and 10% chosen through tournament to survive and "reproduce" for the next generation.
- Limit on number of generations: Not strictly defined in our case, my current implementation allows for configuration through the API. Note that this is the main decider in balancing performance vs accuracy

With these defined we can now build a concrete algorithm:

Given a distribution center, a list of customers, a defined popsize, and a limit on generations:
1. Generate popsize number of routes by randomly permutating customer list (in our case we are always working in permutations to ensure solutions are valid according to TSP)
2. Preserve top 10% of routes according to the fitness function (route length) and 10% of the remaining routes according to [tournament selection](https://en.wikipedia.org/wiki/Tournament_selection), cull the rest of the routes
3. Generate 35% of children utilizing order crossover (splice route segments from one parent to another then fill in the blanks in-order)
4. Generate 35% of children through swap mutation (swap order of two destinations in survivor route)
5. Introduce 10% of popsize as completely random permutation (this helps maintain genetic diversity)
6. Repeat generation limit times and return fittest route

The brute-force approach to TSP is O(n!) time complexity, our approach tries to undercut this using a bit of randomness and a heuristic assumption: good solutions are likely made up of good smaller parts, so we can propogate these good subparts through generations using order crossover and swap mutations. This covers everything you need to know to understand later code, but of course the genetic algorithm rabbit hole goes deeper. [[More](https://en.wikipedia.org/wiki/Genetic_algorithm)]

## Implementation

Looking at how to implement this we already have a good project structure to start with. We have an abstract drone router class that will take care of the basics, an injectible distance function for abstraction, and all the relevant classes to model the problem (i.e. `ServiceDestination.java` holds all pertinent information about destinations). So we can go ahead and put together a class that extends `AbstractDroneRouter.java` with a proper constructor:

```java public class GeneticDroneRouter extends AbstractDroneRouter {
  private int epochs;
  private int populationSize;
  private Random random = new Random();

  public GeneticDroneRouter(TravelMetric distanceFn, int epochs, int populationSize) {
    super(distanceFn);
    this.epochs = epochs;
    this.populationSize = populationSize;
  }
  (...)
}```

And then we can go ahead and implement the required method `route()`, starting with initial random population generation:

```java
// Start with completely random population
    List<List<ServiceDestination>> population = new ArrayList<>();

    for (int i = 0; i < populationSize; i++) {
        List<ServiceDestination> randRoute = new ArrayList<>(serviceDestinations);
        Collections.shuffle(randRoute);
        population.add(randRoute);
    }
```

As for our main loop, each step we will cull the population, crossover survivors, mutate survivors, and introduce randomness:

```java
    // Cull, crossover, mutate, introduce randomness
    for (int i = 0; i < epochs; i++) {
      List<List<ServiceDestination>> culledPopulation = cull(population, distributionCenter);
      population = new ArrayList<>(culledPopulation);
      // Crossover
      while (population.size() < (int) Math.round(populationSize * 0.55)) {
        population.add(
            OX(
                culledPopulation.get(random.nextInt(culledPopulation.size())),
                culledPopulation.get(random.nextInt(culledPopulation.size()))));
      }
      // Mutate
      while (population.size() < (int) Math.round(populationSize * 0.9)) {
        int randIdx = random.nextInt(culledPopulation.size());
        population.add(swapMutate(culledPopulation.get(randIdx)));
      }
      // Maintain diversity
      while (population.size() < populationSize) {
        List<ServiceDestination> randRoute = new ArrayList<>(serviceDestinations);
        Collections.shuffle(randRoute);
        population.add(randRoute);
      }
    }
```

This gets the general gist, but of course the interesting stuff happens in our helper functions, mainly `cull()` and `OX()`. Starting with `cull()` we will simply sort, save the top 10%, then call our `tournamentElimination()` function to select an additional 10%:

```java
  private List<List<ServiceDestination>> cull(
      List<List<ServiceDestination>> population, ServiceDestination origin) {
    List<List<ServiceDestination>> newPopulation = new ArrayList<>();
    int eliteCount = populationSize / 10; // Keep elite 10 percent
    int tournamentCount = populationSize / 10; // Keep 10% selected via tournament

    List<List<ServiceDestination>> sorted = new ArrayList<>(population);
    sorted.sort(Comparator.comparingDouble(route -> routeLength(route, origin)));

    List<List<ServiceDestination>> elites = sorted.subList(0, eliteCount);
    for (int i = 0; i < eliteCount; i++) {
      newPopulation.add(new ArrayList<>(elites.get(i)));
    }

    newPopulation.addAll(
        tournamentElimination(sorted.subList(eliteCount, sorted.size()), tournamentCount, origin));

    return newPopulation;
  }
```

`routeLength()` is just a helper function that accounts for the length of the full path including the origin. So this culls the less fit routes from our population using elitism (keeping the fittest) but the next 10% is chosen through tournament, which is an interesting concept. While tournaments sound like they should pick only the best just like elitism, we actually will be running tournaments on subsets of the remaining population which gives slightly less optimal routes a chance to survive and helps us maintain genetic diversity. Our code is shown below:

```java
  private List<List<ServiceDestination>> tournamentElimination(
      List<List<ServiceDestination>> population, int survivorCount, ServiceDestination origin) {
    List<List<ServiceDestination>> survivors = new ArrayList<>();

    for (int i = 0; i < survivorCount; i++) {
      List<List<ServiceDestination>> tournament = new ArrayList<>();

      for (int j = 0; j < population.size() / 5; j++) {
        List<ServiceDestination> candidate = population.get(random.nextInt(population.size()));
        tournament.add(candidate);
      }

      tournament.sort(Comparator.comparingDouble(route -> routeLength(route, origin)));

      survivors.add(tournament.get(0));
    }

    return survivors;
  }
```

This runs tournaments with only a fifth of the population each time. The rationale behind this is that if a route is good enough to beat out a fifth of the population, it probably has some useful genes (subroutes) that could be benefitial to preserve in the population. Which leads us on to our final bit of interesting code, the `OX()` function. This is one of a handleful of useful crossover methods that apply to our problem and it functions by choosing a random-length subroute in parent1 and creating a child with that subroute in the same location and the rest filled in-order from parent2. An example is shown below for clarity with the selected gene underlined:  
<pre>
p1:    A B C <u>D E F</u> G  
p2:    G A F C D B E  
child: G A C <u>D E F</u> B  
</pre>

If we just make a few list copies this is pretty elementary to implement in code:
```java
  private List<ServiceDestination> OX(
      List<ServiceDestination> parent1, List<ServiceDestination> parent2) {
    // Randomly select a gene from parent1 starting in the first half and ending in the last half
    int size = parent1.size();
    int start = random.nextInt(size / 2);
    int end = start + random.nextInt(size - start);
    List<ServiceDestination> child = new ArrayList<>(Collections.nCopies(size, null));

    // Preserve allele position from gene in child
    for (int i = start; i <= end; i++) {
      child.set(i, parent1.get(i));
    }

    // Fill in remaining slots with parent2 alleles (starting after gene and wrapping back around)
    int currentIdx = (end + 1) % size;
    for (int i = 0; i < size; i++) {
      ServiceDestination candidate = parent2.get((end + 1 + i) % size);
      if (!child.contains(candidate)) {
        child.set(currentIdx, candidate);
        currentIdx = (currentIdx + 1) % size;
      }
    }

    return child;
  }
```

## Testing

Maven makes it easy to get a quick correctness test in and...
```java
  public void setup() {
    dc = new ServiceDestination("warehouse1", 14, 14);
    destinations = new LinkedList<>();
    // each point is further from dc
    destinations.add(new ServiceDestination("A", 13, 12));
    destinations.add(new ServiceDestination("B", 8, 9));
    destinations.add(new ServiceDestination("C", 6, 7));
    destinations.add(new ServiceDestination("D", 5, 5));
    destinations.add(new ServiceDestination("E", 3, 5));
    destinations.add(new ServiceDestination("F", 1, 0));
    router = new GeneticDroneRouter(GeneticDroneRouterTest::euclideanDistance, 100, 30);
  }

  @Test
  public void test_route() {
    List<ServiceDestination> route = router.route(dc, destinations);
    assertThat(route)
        .isNotNull()
        .isNotEmpty()
        .hasSize(6)
        .containsExactlyInAnyOrderElementsOf(destinations);
  }
```
Output:

<pre>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] Scanning for projects...
[<span style="font-weight:bold;color:lightblue;">INFO</span>] 
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;">------------------&lt; </span><span style="color:teal;">io.seedshare:traveling-salesman</span><span style="font-weight:bold;"> &gt;-------------------</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;">Building traveling-salesman 1.0-SNAPSHOT</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;">--------------------------------[ jar ]---------------------------------</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] 
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;">--- </span><span style="color:green;">fmt-maven-plugin:2.9:format</span> <span style="font-weight:bold;">(default)</span> @ <span style="color:teal;">traveling-salesman</span><span style="font-weight:bold;"> ---</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] Processed 8 files (0 reformatted).
[<span style="font-weight:bold;color:lightblue;">INFO</span>] 
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;">--- </span><span style="color:green;">maven-resources-plugin:2.6:resources</span> <span style="font-weight:bold;">(default-resources)</span> @ <span style="color:teal;">traveling-salesman</span><span style="font-weight:bold;"> ---</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] Using 'UTF-8' encoding to copy filtered resources.
[<span style="font-weight:bold;color:lightblue;">INFO</span>] skip non existing resourceDirectory /home/dan/Documents/portfolio/combinatorics-genetic/src/main/resources
[<span style="font-weight:bold;color:lightblue;">INFO</span>] 
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;">--- </span><span style="color:green;">maven-compiler-plugin:3.1:compile</span> <span style="font-weight:bold;">(default-compile)</span> @ <span style="color:teal;">traveling-salesman</span><span style="font-weight:bold;"> ---</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] Nothing to compile - all classes are up to date
[<span style="font-weight:bold;color:lightblue;">INFO</span>] 
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;">--- </span><span style="color:green;">maven-resources-plugin:2.6:testResources</span> <span style="font-weight:bold;">(default-testResources)</span> @ <span style="color:teal;">traveling-salesman</span><span style="font-weight:bold;"> ---</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] Using 'UTF-8' encoding to copy filtered resources.
[<span style="font-weight:bold;color:lightblue;">INFO</span>] skip non existing resourceDirectory /home/dan/Documents/portfolio/combinatorics-genetic/src/test/resources
[<span style="font-weight:bold;color:lightblue;">INFO</span>] 
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;">--- </span><span style="color:green;">maven-compiler-plugin:3.1:testCompile</span> <span style="font-weight:bold;">(default-testCompile)</span> @ <span style="color:teal;">traveling-salesman</span><span style="font-weight:bold;"> ---</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] Nothing to compile - all classes are up to date
[<span style="font-weight:bold;color:lightblue;">INFO</span>] 
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;">--- </span><span style="color:green;">maven-surefire-plugin:2.22.2:test</span> <span style="font-weight:bold;">(default-test)</span> @ <span style="color:teal;">traveling-salesman</span><span style="font-weight:bold;"> ---</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] 
[<span style="font-weight:bold;color:lightblue;">INFO</span>] -------------------------------------------------------
[<span style="font-weight:bold;color:lightblue;">INFO</span>]  T E S T S
[<span style="font-weight:bold;color:lightblue;">INFO</span>] -------------------------------------------------------
[<span style="font-weight:bold;color:lightblue;">INFO</span>] Running io.seedshare.tsp.api.impl.<span style="font-weight:bold;">GeneticDroneRouterTest</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;color:green;">Tests run: 1</span>, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.075 s - in io.seedshare.tsp.api.impl.<span style="font-weight:bold;">GeneticDroneRouterTest</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] Running io.seedshare.tsp.api.impl.<span style="font-weight:bold;">NNDroneRouterTest</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;color:green;">Tests run: 1</span>, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0 s - in io.seedshare.tsp.api.impl.<span style="font-weight:bold;">NNDroneRouterTest</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] 
[<span style="font-weight:bold;color:lightblue;">INFO</span>] Results:
[<span style="font-weight:bold;color:lightblue;">INFO</span>] 
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;color:green;">Tests run: 2, Failures: 0, Errors: 0, Skipped: 0</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] 
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;">------------------------------------------------------------------------</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;color:green;">BUILD SUCCESS</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;">------------------------------------------------------------------------</span>
[<span style="font-weight:bold;color:lightblue;">INFO</span>] Total time:  2.626 s
[<span style="font-weight:bold;color:lightblue;">INFO</span>] Finished at: 2025-06-26T13:34:32-07:00
[<span style="font-weight:bold;color:lightblue;">INFO</span>] <span style="font-weight:bold;">------------------------------------------------------------------------</span>
</pre>

Success! Well, at least in terms of correctness. Optimality is of course the NP-hard part of the problem here which is what I will be exploring in my next post where we'll build a tester program that will use Java Microbenchmark Harness and known optimal solutions from a site like [TSPLIB](http://comopt.ifi.uni-heidelberg.de/software/TSPLIB95/) to compare both runtime performance and optimality performance.