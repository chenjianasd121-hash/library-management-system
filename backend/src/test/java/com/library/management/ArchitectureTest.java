package com.library.management;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packages="com.library.management",importOptions=ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {
    @ArchTest static final ArchRule controllersDoNotUseMappers = noClasses().that().resideInAPackage("..controller..")
        .should().dependOnClassesThat().resideInAPackage("..mapper..");
    @ArchTest static final ArchRule mappersDoNotUseServices = noClasses().that().resideInAPackage("..mapper..")
        .should().dependOnClassesThat().resideInAPackage("..service..");
}
